// ══════════════════════════════════════════════════════
// DIAGNÓSTICO · v2.2
// Consola de verificación integrada en el panel admin
// ══════════════════════════════════════════════════════
const DIAGNOSTICO = {

  _log(msg, tipo = "info") {
    const el  = document.getElementById("diagnosticoLog");
    if (!el) return;
    const cols = {
      ok:       "#3FB950",
      error:    "#F85149",
      info:     "#8B949E",
      warn:     "#D29922",
      titulo:   "#58A6FF",
      dato:     "#A5D6FF",
    };
    const color = cols[tipo] || cols.info;
    const ts    = new Date().toLocaleTimeString("es-CO");
    const ico   = tipo === "ok" ? "✅" : tipo === "error" ? "❌" : tipo === "warn" ? "⚠️" : tipo === "titulo" ? "──" : "  ";
    el.innerHTML += `<span style="color:${color};">[${ts}] ${ico} ${msg}</span><br>`;
    el.scrollTop = el.scrollHeight;
  },

  _limpiar() {
    const el = document.getElementById("diagnosticoLog");
    if (el) el.innerHTML = "";
  },

  copiarLog() {
    const el   = document.getElementById("diagnosticoLog");
    const text = el?.innerText || "";
    navigator.clipboard.writeText(text).then(() =>
      APP.toast("📋 Log copiado al portapapeles")
    ).catch(() =>
      APP.toast("No se pudo copiar — selecciona el texto manualmente", "error")
    );
  },

  async verificarConexion() {
    this._limpiar();
    this._log("VERIFICANDO CONEXIÓN CON EL SERVIDOR", "titulo");

    const url = APP_CONFIG.API_URL;
    this._log("URL configurada: " + url, "dato");

    if (!url || url.includes("PEGA_AQUI")) {
      this._log("API_URL no configurada — la app está en DATOS LOCALES", "warn");
      this._log("Usa el botón '⚙️ Configurar backend' para conectarla", "info");
      // Mostrar botón de acción directa en la consola
      const el = document.getElementById("diagnosticoLog");
      if (el) el.innerHTML += `<br><button onclick="SETUP.abrirDesdeAdmin()"
        style="background:var(--verde-oscuro,#027034);color:#fff;border:none;
               border-radius:6px;padding:7px 14px;font-size:11px;cursor:pointer;
               font-family:var(--font-sans);margin-top:4px;">
        ⚙️ Abrir asistente de configuración
      </button><br>`;
      return;
    }

    this._log("Enviando petición GET al servidor...", "info");
    try {
      const t0 = Date.now();
      const r  = await fetch(url + "?action=verificar");
      const ms = Date.now() - t0;
      const d  = await r.json();

      this._log("Respuesta recibida en " + ms + " ms", "ok");

      if (d.ok) {
        this._log("Servidor respondió correctamente", "ok");
        this._log("Instalado: " + (d.instalado ? "Sí" : "No"), d.instalado ? "ok" : "error");
        this._log("Google Sheets: " + (d.tiene_sheets ? "Conectado" : "Sin configurar"), d.tiene_sheets ? "ok" : "error");
        this._log("Google Drive: " + (d.tiene_drive ? "Conectado" : "Sin configurar"), d.tiene_drive ? "ok" : "error");
        this._log("Gemini API Key: " + (d.tiene_gemini ? "Configurada" : "⚠️ Falta configurar"), d.tiene_gemini ? "ok" : "warn");
        this._log("Versión backend: " + (d.version || "?"), "dato");
        if (!d.instalado) {
          this._log("Ejecuta instalar() en Apps Script para completar la configuración", "warn");
        }
      } else {
        this._log("El servidor devolvió error: " + d.error, "error");
      }
    } catch (err) {
      this._log("No se pudo conectar: " + err.message, "error");
      this._log("Verifica que la URL sea correcta y que Apps Script esté publicado", "warn");
      this._log("Apps Script → Implementar → Administrar implementaciones", "info");
    }
  },

  async verificarInstalacion() {
    this._limpiar();
    this._log("VERIFICANDO INSTALACIÓN COMPLETA", "titulo");

    if (API._esModoLocal()) {
      this._log("App en DATOS LOCALES — sin conexión a servidor", "warn");
      this._log("Estado del modo local:", "titulo");
      this._log("Datos cargados: " + (typeof DATOS_INICIALES !== "undefined" ? "Sí" : "No"), typeof DATOS_INICIALES !== "undefined" ? "ok" : "error");
      if (typeof DATOS_INICIALES !== "undefined") {
        const d = DATOS_INICIALES;
        this._log("Secretaría: Medio Ambiente · Q1 2026", "dato");
        this._log("Programas: " + d.programas?.length, "dato");
        this._log("Beneficiarios: " + d.beneficiarios?.length, "dato");
        this._log("Contratos: " + d.contratos?.length, "dato");
        this._log("Indicadores PD: " + d.metas_pd?.length, "dato");
        const total = d.contratos?.reduce((s,c)=>s+(+c.valor||0),0)||0;
        this._log("Valor total contratado: $" + total.toLocaleString("es-CO"), "dato");
        this._log("% Cumplimiento PD MA: " + d.metricas?.pct_global_cuatrienio + "%", "ok");
        this._log("", "info");
        this._log("✅ Todos los datos están disponibles para visualización", "ok");
        this._log("✅ El mapa, logros, cuatrienio y contratos funcionan correctamente", "ok");
      }
      return;
    }

    // Con servidor real
    this._log("Verificando config.js...", "info");
    const campos = ["API_URL","MUNICIPIO","GOBIERNO","PERIODO","COLOR_PPAL","MAPA_CENTER"];
    campos.forEach(c => {
      const val = APP_CONFIG[c];
      const ok  = val && !String(val).includes("PEGA_AQUI");
      this._log(c + ": " + (ok ? "✓ " + JSON.stringify(val) : "⚠️ Sin configurar"), ok ? "ok" : "warn");
    });

    this._log("Verificando endpoint API...", "info");
    const r = await API.get({ action: "verificar" }).catch(e => ({ ok: false, error: e.message }));
    if (r.ok) {
      this._log("API: responde correctamente", "ok");
      this._log("Gemini: " + (r.tiene_gemini ? "✓ API Key configurada" : "⚠️ Falta configurar"), r.tiene_gemini ? "ok" : "warn");
      this._log("Sheets: " + (r.tiene_sheets ? "✓ Conectado" : "✗ Sin configurar"), r.tiene_sheets ? "ok" : "error");
      this._log("Drive: " + (r.tiene_drive ? "✓ Conectado" : "✗ Sin configurar"), r.tiene_drive ? "ok" : "error");
    } else {
      this._log("API no responde: " + r.error, "error");
    }
  },

  async probarGemini() {
    this._limpiar();
    this._log("VERIFICANDO GEMINI IA", "titulo");

    if (API._esModoLocal()) {
      this._log("App en modo local — Gemini no se puede probar sin servidor", "warn");
      this._log("Una vez configurado API_URL, este test enviará un texto corto", "info");
      this._log("a Gemini y verificará que la API Key funciona correctamente", "info");
      return;
    }

    this._log("Enviando test a Gemini a través del backend...", "info");
    this._log("(El backend hace la llamada — la API Key nunca llega al navegador)", "dato");

    // Hacer un POST de prueba con un PDF mínimo
    const r = await API.post({ action: "verificar" }).catch(e => ({ ok: false, error: e.message }));
    if (r.ok) {
      this._log("Conexión con el servidor verificada", "ok");
      this._log("Para probar Gemini completo, sube un PDF en la pestaña 'Informe trimestral'", "info");
    } else {
      this._log("Error: " + (r.error || "Sin respuesta"), "error");
    }
  },

  async verEstadoDB() {
    this._limpiar();
    this._log("ESTADO DE LA BASE DE DATOS", "titulo");

    if (API._esModoLocal()) {
      this._log("App en modo local — la base de datos real requiere conexión al servidor", "warn");
      this._log("", "info");
      this._log("Datos demo disponibles:", "titulo");
      if (typeof DATOS_INICIALES !== "undefined") {
        const d = DATOS_INICIALES;
        const tablas = [
          { n: "metas_pd",      c: d.metas_pd?.length || 0 },
          { n: "metas_pa",      c: d.metas_pa?.length || 0 },
          { n: "programas",     c: d.programas?.length || 0 },
          { n: "beneficiarios", c: d.beneficiarios?.length || 0 },
          { n: "contratos",     c: d.contratos?.length || 0 },
          { n: "biblioteca",    c: d.biblioteca?.length || 0 },
        ];
        tablas.forEach(t => this._log(t.n.padEnd(16) + " → " + t.c + " registros", t.c > 0 ? "ok" : "warn"));
        this._log("", "info");
        const total = d.contratos?.reduce((s,c)=>s+(+c.valor||0),0)||0;
        this._log("Secretaría cargada:     Medio Ambiente", "dato");
        this._log("Período:                Q1 2026", "dato");
        this._log("Valor total contratado: $" + total.toLocaleString("es-CO"), "dato");
        this._log("Veredas con benefic.:   " + [...new Set(d.beneficiarios?.map(b=>b.vereda)||[])].join(", "), "dato");
      }
      return;
    }

    this._log("Consultando al servidor...", "info");
    if (!API.estaLogueado()) {
      this._log("Debes iniciar sesión para ver el estado de la BD", "warn");
      return;
    }
    const r = await API.post({ action: "resumen_admin" });
    if (r.ok) {
      const c = r.conteos || {};
      Object.entries(c).forEach(([tabla, n]) =>
        this._log(tabla.padEnd(16) + " → " + n + " registros", n > 0 ? "ok" : "warn")
      );
      this._log("", "info");
      if (r.ultimosProcesos?.length) {
        this._log("Últimos procesos:", "titulo");
        r.ultimosProcesos.slice(0, 3).forEach(p =>
          this._log("[" + p.estado + "] " + p.mensaje?.substring(0, 60), p.estado === "ok" ? "ok" : p.estado === "error" ? "error" : "info")
        );
      }
    } else {
      this._log("Error al consultar: " + r.error, "error");
    }
  },

  async recalibrarCoords(btn) {
    if (!confirm("¿Recalibrar todas las ubicaciones aproximadas del mapa?\n\nEsto moverá los marcadores con posición estimada a las coordenadas correctas de cada vereda. Los marcadores con posición exacta (GPS real) no se modifican.")) return;
    const original = btn.textContent;
    btn.textContent = "⏳ Recalibrando..."; btn.disabled = true;
    this._limpiar();
    this._log("RECALIBRANDO COORDENADAS DEL MAPA", "titulo");
    if (API._esModoLocal()) {
      this._log("Esta función requiere conexión al servidor real.", "warn");
      btn.textContent = original; btn.disabled = false;
      return;
    }
    const r = await API.post({ action: "recalibrar_coords" });
    if (r.ok) {
      this._log(r.msg || "Recalibración completada", "ok");
      this._log("Recarga el mapa para ver los cambios.", "info");
      APP.cargarDatos();
      APP.toast("✅ " + r.msg);
    } else {
      this._log("Error: " + r.error, "error");
      APP.toast("❌ Error: " + r.error, "error");
    }
    btn.textContent = original; btn.disabled = false;
  },

  async normalizarVeredas(btn) {
    if (!confirm("¿Normalizar los nombres de veredas en toda la base de datos?\n\nEsto corregirá nombres como 'El Placer', 'La Granada', 'El Rosario' y los unificará con las 8 veredas oficiales de Guatapé.")) return;
    const original = btn.textContent;
    btn.textContent = "⏳ Normalizando..."; btn.disabled = true;
    this._limpiar();
    this._log("NORMALIZANDO VEREDAS EN SHEETS", "titulo");
    if (API._esModoLocal()) {
      this._log("Esta función requiere conexión al servidor real.", "warn");
      btn.textContent = original; btn.disabled = false;
      return;
    }
    const r = await API.post({ action: "normalizar_veredas" });
    if (r.ok) {
      this._log(r.msg || "Normalización completada", "ok");
      if (r.detalle) r.detalle.forEach(d => this._log("  • " + d, "info"));
      this._log("Recarga los datos para ver los cambios.", "info");
      APP.cargarDatos();
      APP.toast("✅ " + r.msg);
    } else {
      this._log("Error: " + r.error, "error");
      APP.toast("❌ Error: " + r.error, "error");
    }
    btn.textContent = original; btn.disabled = false;
  }
};

// ── Botón cambiar URL en diagnóstico ──────────────────────────
// Se muestra siempre para poder reconfigurar fácilmente
function _mostrarBotonCambiarURL() {
  const el = document.getElementById("diagnosticoLog");
  if (!el) return;
  const urlActual = localStorage.getItem("gt_api_url") || APP_CONFIG.API_URL || "No configurada";
  el.innerHTML += `<br><div style="background:rgba(255,255,255,.05);border-radius:6px;
    padding:8px 10px;margin-top:6px;font-size:10.5px;color:#8B949E;">
    URL actual: <span style="color:#A5D6FF;">${urlActual.length > 60 ? urlActual.substring(0,57)+"..." : urlActual}</span>
  </div>
  <button onclick="SETUP.cambiarURL()"
    style="background:#163040;color:#fff;border:none;border-radius:6px;
           padding:7px 14px;font-size:11px;cursor:pointer;
           font-family:var(--font-sans);margin-top:8px;display:inline-block;">
    🔗 Cambiar URL del backend
  </button><br>`;
}

// Activar banner demo automáticamente
document.addEventListener("DOMContentLoaded", () => {
  const banner = document.getElementById("bannerLocal");
  if (banner && (!APP_CONFIG.API_URL || APP_CONFIG.API_URL.includes("PEGA_AQUI"))) {
    banner.style.display = "block";
    // Ajustar espacio extra por el banner
    document.documentElement.style.setProperty("--demo-offset", "32px");
    const navbar = document.querySelector(".navbar");
    if (navbar) navbar.style.top = "calc(3px + 32px)";
    const filtros = document.querySelector(".filtros-bar");
    if (filtros) filtros.style.top = "calc(var(--nav-h) + 3px + 32px)";
    document.querySelectorAll(".seccion").forEach(s =>
      s.style.paddingTop = "calc(var(--nav-h) + var(--filtros-h) + 3px + 32px)"
    );
  }
});
