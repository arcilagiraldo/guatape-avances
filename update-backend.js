#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
// UPDATE BACKEND — Actualiza solo el código en Apps Script
// NO toca el Spreadsheet ni cambia la URL del backend
//
// USO: node update-backend.js
// ══════════════════════════════════════════════════════════════

const fs    = require("fs");
const path  = require("path");
const https = require("https");

const CONFIG_FILE  = ".deploy-config.json";
const BACKEND_FILE = path.join(__dirname, "backend", "GUATAPE_BACKEND_COMPLETO.gs");
const BACKEND_URL  = "https://script.google.com/macros/s/AKfycbxXv6Q08lWcNiVz6LEauVONJiBUWL9hYxdCn_Ac3vlx4PyxcJrukfu89vFSEyhJBuDoPg/exec";

const OAUTH = {
  client_id:     "1072696220534-ol0f8eu5l5bqhkhvq4lte3aq3gp2fkqr.apps.googleusercontent.com",
  client_secret: "GOCSPX-placeholder",
};

const ok   = m => console.log(`✅ ${m}`);
const info = m => console.log(`ℹ️  ${m}`);
const err  = m => { console.error(`❌ ${m}`); process.exit(1); };

function leerConfig() {
  if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  return {};
}
function guardarConfig(cfg) { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); }

function httpPost(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = new URLSearchParams(body).toString();
    const req = https.request({ hostname, path, method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    }, res => {
      let d = ""; res.on("data", x => d += x);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on("error", reject); req.write(bodyStr); req.end();
  });
}

function api(method, endpoint, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : "";
    const req = https.request({
      hostname: "script.googleapis.com", path: `/v1${endpoint}`, method,
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json",
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}) }
    }, res => {
      let d = ""; res.on("data", x => d += x);
      res.on("end", () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
                             catch(e) { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on("error", reject); if (bodyStr) req.write(bodyStr); req.end();
  });
}

async function obtenerToken(cfg) {
  if (cfg.access_token && cfg.token_expires && Date.now() < cfg.token_expires - 60000) {
    return cfg.access_token;
  }
  if (!cfg.refresh_token) err("No hay token guardado. Ejecuta primero: node setup-backend.js");
  info("Renovando token...");
  const t = await httpPost("oauth2.googleapis.com", "/token", {
    refresh_token: cfg.refresh_token,
    client_id: OAUTH.client_id, client_secret: OAUTH.client_secret,
    grant_type: "refresh_token"
  });
  if (!t.access_token) err("No se pudo renovar el token: " + JSON.stringify(t));
  cfg.access_token  = t.access_token;
  cfg.token_expires = Date.now() + (t.expires_in * 1000);
  guardarConfig(cfg);
  ok("Token renovado");
  return cfg.access_token;
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════╗");
  console.log("║  UPDATE BACKEND — Solo código, sin tocar datos ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  if (!fs.existsSync(BACKEND_FILE)) err("No se encuentra backend/GUATAPE_BACKEND_COMPLETO.gs");
  const gsCode = fs.readFileSync(BACKEND_FILE, "utf8");

  const cfg = leerConfig();
  if (!cfg.script_id) err("No hay script_id en .deploy-config.json. Ejecuta setup-backend.js primero.");

  const token = await obtenerToken(cfg);
  const scriptId = cfg.script_id;

  // 1. Subir código actualizado
  info("Subiendo código actualizado...");
  const uploadRes = await api("PUT", `/projects/${scriptId}/content`, {
    files: [{
      name: "backend", type: "SERVER_JS", source: gsCode
    }, {
      name: "appsscript", type: "JSON",
      source: JSON.stringify({
        timeZone: "America/Bogota", dependencies: {},
        exceptionLogging: "STACKDRIVER", runtimeVersion: "V8",
        webapp: { executeAs: "USER_DEPLOYING", access: "ANYONE_ANONYMOUS" }
      })
    }]
  }, token);

  if (uploadRes.status !== 200) err("Error subiendo código: " + JSON.stringify(uploadRes.body));
  ok("Código subido");

  // 2. Crear nueva versión del script
  info("Creando nueva versión...");
  const versionRes = await api("POST", `/projects/${scriptId}/versions`,
    { description: "Actualización automática" }, token);
  const versionNum = versionRes.body.versionNumber;
  if (!versionNum) {
    console.log("⚠️  No se pudo crear versión numerada. El código ya está actualizado en modo dev.");
  } else {
    ok(`Versión ${versionNum} creada`);
  }

  // 3. Actualizar deployment existente
  info("Actualizando deployment...");
  const listRes = await api("GET", `/projects/${scriptId}/deployments`, null, token);
  const deploys = listRes.body.deployments || [];

  // Buscar el deployment que corresponde a la URL conocida (no el HEAD)
  const deploy = deploys.find(d =>
    d.entryPoints?.some(e => e.webApp?.url?.includes("macros/s/"))
  ) || deploys[deploys.length - 1];

  if (deploy?.deploymentId) {
    const updateRes = await api("PUT",
      `/projects/${scriptId}/deployments/${deploy.deploymentId}`,
      { deploymentConfig: {
          scriptId,
          versionNumber: versionNum || 1,
          manifestFileName: "appsscript",
          description: "Actualización automática"
        }
      }, token);
    if (updateRes.status === 200) {
      ok("Deployment actualizado — misma URL conservada");
    } else {
      console.log("⚠️  No se pudo actualizar deployment automáticamente.");
      console.log("   Ve a script.google.com → Implementar → Administrar implementaciones → Nueva versión");
    }
  }

  console.log("\n╔════════════════════════════════════════════════╗");
  console.log("║  ✅ BACKEND ACTUALIZADO                        ║");
  console.log("╚════════════════════════════════════════════════╝");
  console.log(`\n  URL: ${cfg.web_app_url || BACKEND_URL}\n`);
}

main().catch(e => { console.error("Error:", e); process.exit(1); });
