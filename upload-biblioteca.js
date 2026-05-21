#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
// UPLOAD BIBLIOTECA — Observatorio Municipal Guatapé
//
// Sube todos los archivos de "informacion inicial/" a la
// biblioteca de la app (Google Drive + Google Sheets).
//
// USO:
//   node upload-biblioteca.js
//
// También puedes apuntar a otra carpeta:
//   node upload-biblioteca.js "ruta/a/mis/documentos"
//
// Credenciales: usa el usuario admin_guatape del backend.
// Se puede ejecutar varias veces — reemplaza el archivo
// anterior sin crear duplicados (idempotente).
// ══════════════════════════════════════════════════════════════

"use strict";
const fs    = require("fs");
const path  = require("path");
const https = require("https");
const http  = require("http");

// ── Configuración ─────────────────────────────────────────────
const CARPETA  = path.join(__dirname, process.argv[2] || "informacion inicial");
const CONFIG_JS = path.join(__dirname, "frontend", "js", "config.js");

// Credenciales del superadmin (definidas en el backend .gs)
const USUARIO  = "admin_guatape";
const PASSWORD = "Admin2024!";

// Secretaría según los primeros 2 dígitos del código de programa
const SEC_POR_PREFIJO = {
  "05": "medio_ambiente",
  "06": "gobierno",
  "07": "bienestar",
  "08": "turismo",
  "09": "planeacion",
  "10": "hacienda",
};

// ── Helpers de log ────────────────────────────────────────────
const ok   = m => console.log(`  ✅ ${m}`);
const info = m => console.log(`  ℹ️  ${m}`);
const warn = m => console.log(`  ⚠️  ${m}`);
const fail = m => console.log(`  ❌ ${m}`);

// ── Leer API_URL desde config.js ──────────────────────────────
function leerApiUrl() {
  if (!fs.existsSync(CONFIG_JS)) throw new Error("No se encontró frontend/js/config.js");
  const src = fs.readFileSync(CONFIG_JS, "utf8");
  const m   = src.match(/API_URL:\s*"(https:\/\/[^"]+)"/);
  if (!m) throw new Error("API_URL no encontrada en config.js. ¿Ya hiciste el deploy del backend?");
  return m[1];
}

// ── Parsear metadatos del nombre de archivo ───────────────────
function parsearArchivo(nombre) {
  const ext     = path.extname(nombre).toLowerCase();
  const esPDF   = ext === ".pdf";
  const esExcel = ext === ".xlsx" || ext === ".xls";
  if (!esPDF && !esExcel) return null;

  // Extraer código de programa (6 dígitos: 050201, 050106, etc.)
  // No usa \b porque el código puede ir pegado a _ en el nombre del archivo
  const codeMatch = nombre.match(/(?<![0-9])(0[0-9]{5})(?![0-9])/);
  const codigo    = codeMatch ? codeMatch[1] : null;

  // Extraer año (2024-2030)
  const yearMatch = nombre.match(/\b(202[0-9])\b/);
  const anio      = yearMatch ? parseInt(yearMatch[1]) : 2026;

  // Determinar secretaría
  const secretaria = codigo
    ? (SEC_POR_PREFIJO[codigo.substring(0, 2)] || "medio_ambiente")
    : "medio_ambiente";

  // Tipo y etiqueta
  let tipo, etiqueta, trimestre;
  if (esExcel) {
    tipo      = "excel_pa";
    etiqueta  = codigo || "general";
    trimestre = "";
  } else {
    tipo      = "informe_pdf";
    etiqueta  = codigo || nombre.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 30);
    trimestre = 1; // los informes iniciales son Q1 2026
  }

  const mime = esExcel
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "application/pdf";

  // Nombre limpio para guardar en Drive (sin caracteres especiales)
  const nombreDrive = nombre
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // quitar tildes
    .replace(/[^a-zA-Z0-9._() -]/g, "_");

  return { tipo, etiqueta, secretaria, anio, trimestre, mime, nombreDrive, codigo };
}

// ── HTTP helpers (maneja redirect de Apps Script) ─────────────
// Apps Script: POST → 302 → sigue con GET al URL del redirect
// El resultado JSON está en el destino del redirect (googleusercontent.com)
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const mod    = urlObj.protocol === "https:" ? https : http;
    mod.get(url, res => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        // Redireccion adicional (poco frecuente)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpGet(res.headers.location).then(resolve).catch(reject);
        }
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("Respuesta no JSON (" + res.statusCode + "): " + raw.substring(0, 200))); }
      });
    }).on("error", reject);
  });
}

function post(url, data) {
  return new Promise((resolve, reject) => {
    const body   = JSON.stringify(data);
    const urlObj = new URL(url);
    const mod    = urlObj.protocol === "https:" ? https : http;
    const options = {
      hostname: urlObj.hostname,
      path:     urlObj.pathname + urlObj.search,
      method:   "POST",
      headers: {
        "Content-Type":   "text/plain",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = mod.request(options, res => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        // Apps Script responde 302 → el JSON está en el destino del redirect
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpGet(res.headers.location).then(resolve).catch(reject);
        }
        const raw = Buffer.concat(chunks).toString();
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("Respuesta no JSON (" + res.statusCode + "): " + raw.substring(0, 200))); }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log("\n════════════════════════════════════════════════");
  console.log(" 📚 Carga de Biblioteca — Observatorio Guatapé");
  console.log("════════════════════════════════════════════════\n");

  // Validar carpeta
  if (!fs.existsSync(CARPETA)) {
    console.error(`❌ Carpeta no encontrada: ${CARPETA}`);
    process.exit(1);
  }

  // API URL
  let API_URL;
  try { API_URL = leerApiUrl(); }
  catch (e) { console.error("❌ " + e.message); process.exit(1); }
  info(`API: ${API_URL.substring(0, 60)}…`);

  // Login
  console.log("\n🔑 Iniciando sesión...");
  let token;
  try {
    const res = await post(API_URL, { action: "login", usuario: USUARIO, password: PASSWORD });
    if (!res.ok) { console.error("❌ Login fallido:", res.error); process.exit(1); }
    token = res.token;
    ok(`Sesión iniciada como "${res.nombre}"`);
  } catch (e) {
    console.error("❌ Error de conexión al login:", e.message);
    process.exit(1);
  }

  // Listar archivos
  const archivos = fs.readdirSync(CARPETA).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ext === ".pdf" || ext === ".xlsx" || ext === ".xls";
  });

  if (!archivos.length) {
    warn(`No se encontraron archivos PDF o Excel en: ${CARPETA}`);
    process.exit(0);
  }

  console.log(`\n📁 ${archivos.length} archivo(s) en "${path.basename(CARPETA)}":\n`);

  let subidos = 0, errores = 0, omitidos = 0;

  for (const archivo of archivos) {
    const meta = parsearArchivo(archivo);
    if (!meta) { omitidos++; continue; }

    console.log(`📄 ${archivo}`);
    info(`Sec: ${meta.secretaria} | Tipo: ${meta.tipo} | Año: ${meta.anio}${meta.trimestre ? " Q" + meta.trimestre : ""} | Etiqueta: ${meta.etiqueta}`);

    // Leer y convertir a base64
    let base64;
    try {
      const buf = fs.readFileSync(path.join(CARPETA, archivo));
      base64    = buf.toString("base64");
      info(`Tamaño: ${(buf.length / 1024).toFixed(0)} KB`);
    } catch (e) {
      fail(`No se pudo leer el archivo: ${e.message}`);
      errores++;
      continue;
    }

    // Subir
    try {
      const res = await post(API_URL, {
        action:         "subir_documento",
        token,
        secretaria:     meta.secretaria,
        anio:           meta.anio,
        trimestre:      meta.trimestre,
        tipo:           meta.tipo,
        etiqueta:       meta.etiqueta,
        nombre_archivo: meta.nombreDrive,
        mime:           meta.mime,
        base64,
      });

      if (res.ok) {
        ok(`Subido → ${res.url}`);
        subidos++;
      } else {
        fail(`Error del backend: ${res.error}`);
        errores++;
      }
    } catch (e) {
      fail(`Error de red: ${e.message}`);
      errores++;
    }

    console.log();
  }

  // Logout
  try { await post(API_URL, { action: "logout", token }); } catch (_) {}

  // Resumen
  console.log("════════════════════════════════════════════════");
  console.log(`  ✅ Subidos:  ${subidos}`);
  if (errores)  console.log(`  ❌ Errores:  ${errores}`);
  if (omitidos) console.log(`  ⏭  Omitidos: ${omitidos} (tipo no soportado)`);
  console.log("════════════════════════════════════════════════");
  if (subidos > 0)
    console.log("\n  La biblioteca ya tiene los documentos disponibles en la app.\n");
}

main().catch(e => {
  console.error("\n❌ Error fatal:", e.message);
  process.exit(1);
});
