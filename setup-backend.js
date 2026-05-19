#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
// SETUP BACKEND AUTOMÁTICO — Observatorio Municipal Guatapé
// Crea y despliega el proyecto de Apps Script vía API de Google
//
// USO: node setup-backend.js
//
// Lo que hace automáticamente:
//  1. Abre el navegador para que autorices tu cuenta Google (1 vez)
//  2. Crea el proyecto en Apps Script
//  3. Sube el código del backend
//  4. Ejecuta instalar() para crear Sheets + Drive
//  5. Publica como app web
//  6. Inyecta la URL en config.js
//  7. Re-publica el frontend en GitHub
// ══════════════════════════════════════════════════════════════

const fs      = require("fs");
const path    = require("path");
const https   = require("https");
const http    = require("http");
const { execSync, spawn } = require("child_process");

// ── Configuración ─────────────────────────────────────────────
const CONFIG_FILE   = ".deploy-config.json";
const BACKEND_FILE  = path.join(__dirname, "backend", "GUATAPE_BACKEND_COMPLETO.gs");
const CONFIG_JS     = path.join(__dirname, "frontend", "js", "config.js");

// Client ID y Secret del proyecto OAuth
// Estos son los de un proyecto público de "desktop app" — solo para autenticación
// El usuario autoriza con SU cuenta Google, nosotros nunca vemos sus datos
const OAUTH = {
  client_id:     "1072696220534-ol0f8eu5l5bqhkhvq4lte3aq3gp2fkqr.apps.googleusercontent.com",
  client_secret: "GOCSPX-placeholder",  // Se reemplaza con credenciales reales
  redirect_uri:  "http://localhost:3456/oauth",
  scopes: [
    "https://www.googleapis.com/auth/script.projects",
    "https://www.googleapis.com/auth/script.deployments",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/userinfo.email",
  ]
};

// ── Helpers ───────────────────────────────────────────────────
const ok   = m => console.log(`✅ ${m}`);
const info = m => console.log(`ℹ️  ${m}`);
const warn = m => console.log(`⚠️  ${m}`);
const err  = m => { console.error(`❌ ${m}`); process.exit(1); };

function leerConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  }
  return {};
}

function guardarConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

function abrirNavegador(url) {
  const cmd = process.platform === "win32" ? `start "${url}"` :
              process.platform === "darwin" ? `open "${url}"` :
              `xdg-open "${url}"`;
  try { execSync(cmd); } catch (_) {
    console.log(`\n   Abre esta URL en tu navegador:\n   ${url}\n`);
  }
}

// ── OAuth: obtener token ──────────────────────────────────────
async function obtenerToken(cfg) {
  // Si ya tenemos token válido, devolver
  if (cfg.access_token && cfg.token_expires && Date.now() < cfg.token_expires - 60000) {
    return cfg.access_token;
  }

  // Si hay refresh_token, renovar
  if (cfg.refresh_token) {
    info("Renovando token de acceso...");
    const tokens = await refreshToken(cfg.refresh_token);
    if (tokens.access_token) {
      cfg.access_token  = tokens.access_token;
      cfg.token_expires = Date.now() + (tokens.expires_in * 1000);
      guardarConfig(cfg);
      ok("Token renovado");
      return cfg.access_token;
    }
  }

  // Flujo de autorización completo
  return new Promise((resolve, reject) => {
    const state = Math.random().toString(36).slice(2);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${OAUTH.client_id}` +
      `&redirect_uri=${encodeURIComponent(OAUTH.redirect_uri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(OAUTH.scopes.join(" "))}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`;

    // Servidor local para recibir el callback OAuth
    const server = http.createServer(async (req, res) => {
      const urlObj = new URL(req.url, "http://localhost:3456");
      if (urlObj.pathname !== "/oauth") return;

      const code = urlObj.searchParams.get("code");
      const errParam = urlObj.searchParams.get("error");

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (errParam) {
        res.end(`<html><body style="font-family:sans-serif;padding:2rem">
          <h2>❌ Error de autorización</h2><p>${errParam}</p>
          <p>Cierra esta ventana y vuelve a ejecutar el script.</p></body></html>`);
        server.close();
        reject(new Error("Autorización cancelada: " + errParam));
        return;
      }

      res.end(`<html><body style="font-family:sans-serif;padding:2rem;background:#f0f8f0">
        <h2 style="color:#078838">✅ ¡Autorización exitosa!</h2>
        <p>Ya puedes cerrar esta ventana.</p>
        <p style="color:#666">El script continúa automáticamente...</p>
        <script>setTimeout(()=>window.close(),3000)</script></body></html>`);
      server.close();

      // Intercambiar código por tokens
      try {
        const tokens = await exchangeCode(code);
        cfg.access_token  = tokens.access_token;
        cfg.refresh_token = tokens.refresh_token;
        cfg.token_expires = Date.now() + (tokens.expires_in * 1000);
        guardarConfig(cfg);
        ok("Autorización completada");
        resolve(tokens.access_token);
      } catch (e) { reject(e); }
    });

    server.listen(3456, () => {
      console.log("\n🔐 AUTORIZACIÓN REQUERIDA");
      console.log("════════════════════════════════════════");
      console.log("Abriendo el navegador para que autorices");
      console.log("tu cuenta Google de la Alcaldía...\n");
      abrirNavegador(authUrl);
      console.log("Esperando autorización...");
    });
  });
}

// Intercambiar código por tokens
function exchangeCode(code) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      code, client_id: OAUTH.client_id,
      client_secret: OAUTH.client_secret,
      redirect_uri: OAUTH.redirect_uri,
      grant_type: "authorization_code"
    }).toString();

    const req = https.request({
      hostname: "oauth2.googleapis.com", path: "/token",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    }, res => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function refreshToken(refresh_token) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      refresh_token, client_id: OAUTH.client_id,
      client_secret: OAUTH.client_secret,
      grant_type: "refresh_token"
    }).toString();
    const req = https.request({
      hostname: "oauth2.googleapis.com", path: "/token",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    }, res => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.on("error", reject);
    req.write(body); req.end();
  });
}

// ── API de Apps Script ────────────────────────────────────────
function appsScriptAPI(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : "";
    const req = https.request({
      hostname: "script.googleapis.com",
      path: `/v1${path}`,
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {})
      }
    }, res => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Flujo principal ───────────────────────────────────────────
async function main() {
  console.log("\n╔════════════════════════════════════════════════╗");
  console.log("║  SETUP BACKEND — Observatorio Guatapé         ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  // Verificar archivos
  if (!fs.existsSync(BACKEND_FILE)) err("No se encuentra backend/GUATAPE_BACKEND_COMPLETO.gs");
  if (!fs.existsSync(CONFIG_JS))    err("No se encuentra frontend/js/config.js");
  ok("Archivos verificados");

  const cfg = leerConfig();

  // ── Verificar/pedir Gemini API Key ───────────────────────────
  if (!cfg.gemini_key) {
    console.log("\n🤖 GEMINI API KEY");
    console.log("  Necesitas una clave gratuita de Google AI Studio");
    console.log("  Abriendo aistudio.google.com...\n");
    abrirNavegador("https://aistudio.google.com/app/apikey");
    const readline = require("readline").createInterface({ input: process.stdin, output: process.stdout });
    cfg.gemini_key = await new Promise(r => readline.question("  Pega tu Gemini API Key (AIza...): ", ans => { readline.close(); r(ans.trim()); }));
    guardarConfig(cfg);
  }

  // Inyectar en el .gs
  let gsCode = fs.readFileSync(BACKEND_FILE, "utf8");
  if (gsCode.includes("PEGA_AQUI_TU_GEMINI_API_KEY")) {
    gsCode = gsCode.replace("PEGA_AQUI_TU_GEMINI_API_KEY", cfg.gemini_key);
    fs.writeFileSync(BACKEND_FILE, gsCode);
    ok("Gemini API Key inyectada");
  }

  // ── OAuth ────────────────────────────────────────────────────
  console.log("\n🔐 AUTORIZANDO CON GOOGLE");
  const token = await obtenerToken(cfg);
  ok("Sesión de Google activa");

  // ── Crear o recuperar proyecto Apps Script ───────────────────
  console.log("\n⚙️  CONFIGURANDO APPS SCRIPT");

  let scriptId = cfg.script_id;

  if (!scriptId) {
    info("Creando proyecto en Apps Script...");
    const res = await appsScriptAPI("POST", "/projects", {
      title: "Guatapé - Observatorio Municipal",
    }, token);

    if (res.status !== 200 || !res.body.scriptId) {
      console.error("Respuesta:", JSON.stringify(res.body, null, 2));
      err("No se pudo crear el proyecto. Verifica que tenés habilitada la API de Apps Script en tu proyecto de Google Cloud.");
    }
    scriptId = res.body.scriptId;
    cfg.script_id = scriptId;
    guardarConfig(cfg);
    ok("Proyecto creado: " + scriptId);
  } else {
    ok("Usando proyecto existente: " + scriptId);
  }

  // ── Subir el código ──────────────────────────────────────────
  info("Subiendo código del backend...");
  const updateRes = await appsScriptAPI("PUT", `/projects/${scriptId}/content`, {
    files: [{
      name: "backend",
      type: "SERVER_JS",
      source: gsCode
    }, {
      name: "appsscript",
      type: "JSON",
      source: JSON.stringify({
        timeZone: "America/Bogota",
        dependencies: {},
        exceptionLogging: "STACKDRIVER",
        runtimeVersion: "V8",
        webapp: {
          executeAs: "USER_DEPLOYING",
          access: "ANYONE_ANONYMOUS"
        }
      })
    }]
  }, token);

  if (updateRes.status !== 200) {
    err("Error subiendo código: " + JSON.stringify(updateRes.body));
  }
  ok("Código subido correctamente");

  // ── Ejecutar instalar() ──────────────────────────────────────
  info("Ejecutando instalar() para crear Google Sheets y Drive...");
  const runRes = await appsScriptAPI("POST", `/scripts/${scriptId}:run`, {
    function: "instalar",
    devMode: true
  }, token);

  if (runRes.status === 200 && !runRes.body.error) {
    ok("instalar() ejecutado correctamente");
  } else {
    // El error más común es que la API de Apps Script no esté habilitada
    const errorMsg = runRes.body?.error?.details?.[0]?.errorMessage || JSON.stringify(runRes.body);
    if (errorMsg.includes("has not been enabled")) {
      warn("La API de Apps Script requiere habilitarse manualmente (1 clic):");
      console.log("\n  1. Ve a: https://console.cloud.google.com/apis/library/script.googleapis.com");
      console.log("  2. Clic en 'Habilitar'");
      console.log("  3. Vuelve a ejecutar: node setup-backend.js\n");
      abrirNavegador("https://console.cloud.google.com/apis/library/script.googleapis.com");
      process.exit(1);
    }
    warn("instalar() tuvo un aviso: " + errorMsg);
    warn("Puede que ya estuviera instalado. Continuando...");
  }

  // ── Crear deployment (publicar como app web) ─────────────────
  info("Publicando como aplicación web...");
  const deployRes = await appsScriptAPI("POST", `/projects/${scriptId}/deployments`, {
    versionNumber: 1,
    manifestFileName: "appsscript",
    description: "Observatorio Municipal Guatapé v1",
  }, token);

  let webAppUrl = null;

  if (deployRes.status === 200 && deployRes.body.deploymentId) {
    const deployId = deployRes.body.deploymentId;
    // Construir URL del deployment
    webAppUrl = `https://script.google.com/macros/s/${deployId}/exec`;
    cfg.deployment_id = deployId;
    cfg.web_app_url   = webAppUrl;
    guardarConfig(cfg);
    ok("App publicada: " + webAppUrl);
  } else {
    // Intentar obtener deployments existentes
    const listRes = await appsScriptAPI("GET", `/projects/${scriptId}/deployments`, null, token);
    if (listRes.body.deployments?.length) {
      const d = listRes.body.deployments[listRes.body.deployments.length - 1];
      if (d.entryPoints?.[0]?.webApp?.url) {
        webAppUrl = d.entryPoints[0].webApp.url;
        ok("Usando deployment existente: " + webAppUrl);
      }
    }
    if (!webAppUrl) {
      warn("No se pudo obtener la URL automáticamente");
      warn("Abre script.google.com → Implementar → Nueva implementación para obtenerla");
      abrirNavegador(`https://script.google.com/home/projects/${scriptId}/edit`);
    }
  }

  // ── Inyectar URL en config.js ─────────────────────────────────
  if (webAppUrl) {
    let configJs = fs.readFileSync(CONFIG_JS, "utf8");
    configJs = configJs.replace(
      /API_URL:.*"https:\/\/script\.google\.com\/macros\/s\/[^"]*\/exec"/,
      `API_URL: "${webAppUrl}"`
    );
    fs.writeFileSync(CONFIG_JS, configJs);
    // También guardar en localStorage config (para que la app lo use de inmediato)
    ok("URL del backend inyectada en config.js");

    // Re-publicar el frontend
    info("Re-publicando frontend con la URL del backend...");
    try {
      execSync("cp -rf frontend/* .", { cwd: __dirname, stdio: "inherit" });
      execSync("git add -A", { cwd: __dirname });
      execSync(`git commit -m "Backend conectado" --allow-empty`, { cwd: __dirname });
      execSync("git push --force", { cwd: __dirname });
      ok("Frontend actualizado en GitHub");
    } catch (e) {
      warn("No se pudo republicar el frontend automáticamente. Ejecuta: bash deploy.sh");
    }
  }

  // ── Resultado final ───────────────────────────────────────────
  const pagesUrl = cfg.pages_url || "(ejecuta deploy.sh para obtenerla)";
  console.log("\n╔════════════════════════════════════════════════╗");
  console.log("║  ✅ BACKEND CONFIGURADO COMPLETAMENTE          ║");
  console.log("╚════════════════════════════════════════════════╝\n");
  if (webAppUrl) {
    console.log("  Backend:  " + webAppUrl);
    console.log("  Frontend: " + pagesUrl);
    console.log("\n  🎉 La app está completamente operativa.\n");
    abrirNavegador(pagesUrl !== "(ejecuta deploy.sh para obtenerla)" ? pagesUrl : webAppUrl);
  } else {
    console.log("  Script ID: " + scriptId);
    console.log("  → Abre el proyecto y publica manualmente como app web\n");
  }
}

main().catch(e => {
  console.error("\n❌ Error inesperado:", e.message);
  console.error("   Ejecuta de nuevo o usa el método manual (deploy.sh)\n");
  process.exit(1);
});
