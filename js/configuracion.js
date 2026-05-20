// ══════════════════════════════════════════════════════════════
// CONFIGURACIÓN · v2.3
// Panel visual de configuración — todo desde la app, sin tocar archivos
// Guarda en localStorage y aplica en tiempo real
// ══════════════════════════════════════════════════════════════

const CONFIG_APP = {

  // Clave de almacenamiento
  _KEY: "gt_config",

  // Valores por defecto (los del manual de identidad de Guatapé)
  _defaults: {
    municipio:    "Guatapé",
    departamento: "Antioquia",
    gobierno:     "Juntos Construimos Guatapé",
    periodo:      "2024–2027",
    nit:          "890 983 830 - 3",
    web:          "municipiodeguatape.gov.co",
    mapa_lat:     "6.2321",
    mapa_lng:     "-75.1567",
    mapa_zoom:    "13",
    color_azul:   "#89C4E2",
    color_amarillo:"#FBDC08",
    color_verde:  "#078838",
    color_marino: "#17272D",
    color_gris:   "#606060",
    api_url:      ""
  },

  // Cargar config guardada (merge con defaults)
  cargar() {
    try {
      const saved = localStorage.getItem(this._KEY);
      return saved ? { ...this._defaults, ...JSON.parse(saved) } : { ...this._defaults };
    } catch { return { ...this._defaults }; }
  },

  // Guardar
  guardar(cfg) {
    localStorage.setItem(this._KEY, JSON.stringify(cfg));
    // Si hay API URL, también guardarla donde la lee api.js
    if (cfg.api_url) localStorage.setItem("gt_api_url", cfg.api_url);
  },

  // Aplicar colores al DOM en tiempo real
  aplicarColores(cfg) {
    const r = document.documentElement;
    r.style.setProperty("--azul",     cfg.color_azul);
    r.style.setProperty("--verde",    cfg.color_verde);
    r.style.setProperty("--amarillo", cfg.color_amarillo);
    r.style.setProperty("--marino",   cfg.color_marino);
    r.style.setProperty("--gris",     cfg.color_gris);
    // Derivados automáticos
    r.style.setProperty("--azul-50",    cfg.color_azul    + "22");
    r.style.setProperty("--verde-50",   cfg.color_verde   + "22");
    r.style.setProperty("--amarillo-50",cfg.color_amarillo+ "22");
    r.style.setProperty("--azul-dark",  this._oscurecer(cfg.color_azul, 20));
  },

  // Aplicar textos al DOM
  aplicarTextos(cfg) {
    const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
    set("navTitulo",     cfg.gobierno);
    set("footerGobierno",cfg.municipio ? "Alcaldía de " + cfg.municipio : cfg.gobierno);
    set("footerNIT",     cfg.nit);
    if (document.getElementById("footerWeb"))
      document.getElementById("footerWeb").textContent = cfg.web;
    const sub = document.querySelector(".nav-sub");
    if (sub) sub.textContent = cfg.periodo + " · Observatorio municipal";
    document.title = cfg.gobierno + " " + cfg.periodo + " · Observatorio Municipal";
  },

  // Aplicar config completa
  aplicar(cfg) {
    this.aplicarColores(cfg);
    this.aplicarTextos(cfg);
    // Actualizar APP_CONFIG para que el resto del código lo use
    if (typeof APP_CONFIG !== "undefined") {
      APP_CONFIG.MUNICIPIO    = cfg.municipio;
      APP_CONFIG.GOBIERNO     = cfg.gobierno;
      APP_CONFIG.PERIODO      = cfg.periodo;
      APP_CONFIG.MAPA_CENTER  = [parseFloat(cfg.mapa_lat)||6.2321, parseFloat(cfg.mapa_lng)||-75.1567];
      APP_CONFIG.MAPA_ZOOM    = parseInt(cfg.mapa_zoom)||13;
      if (cfg.api_url) APP_CONFIG.API_URL = cfg.api_url;
    }
  },

  // Inicializar: cargar y aplicar al arrancar la app
  init() {
    const cfg = this.cargar();
    this.aplicar(cfg);
    // Aplicar escudo guardado
    const escudo = localStorage.getItem("gt_escudo");
    if (escudo) this._aplicarEscudo(escudo);
  },

  // Oscurecer color hex
  _oscurecer(hex, pct) {
    try {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.max(0, (n>>16) - Math.round(255*pct/100));
      const g = Math.max(0, ((n>>8)&0xff) - Math.round(255*pct/100));
      const b = Math.max(0, (n&0xff) - Math.round(255*pct/100));
      return `#${((r<<16)|(g<<8)|b).toString(16).padStart(6,"0")}`;
    } catch { return hex; }
  },

  // ── PANEL VISUAL ─────────────────────────────────────────────
  renderPanel() {
    const cfg = this.cargar();
    const el  = document.getElementById("tab-configuracion");
    if (!el) return;

    el.innerHTML = `
      <div style="padding:1rem 0 2rem">

        <!-- URL del backend -->
        <div style="background:var(--azul-50);border:.5px solid var(--azul);border-radius:var(--radio);padding:1rem;margin-bottom:1.25rem">
          <div style="font-size:12.5px;font-weight:500;color:var(--marino);margin-bottom:10px">🔗 Conexión al servidor</div>
          <div class="form-group" style="margin-bottom:8px">
            <label>URL del backend (Apps Script)</label>
            <input type="url" id="cfg_api_url" value="${cfg.api_url || APP_CONFIG?.API_URL || ''}"
              placeholder="https://script.google.com/macros/s/XXXXX/exec"
              style="font-family:monospace;font-size:11.5px">
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-primary" onclick="CONFIG_APP._verificarURL()" style="font-size:12px;flex:1">
              🔌 Verificar conexión
            </button>
            <button class="btn-secondary" onclick="SETUP.abrirDesdeAdmin()" style="font-size:12px;flex:1">
              ⚙️ Asistente de instalación
            </button>
          </div>
          <div id="cfg_url_status" style="margin-top:8px;font-size:11px;display:none"></div>
        </div>

        <!-- Escudo / Logo -->
        <div style="background:#fff;border:.5px solid var(--borde);border-radius:var(--radio);padding:1rem;margin-bottom:1.25rem">
          <div style="font-size:12.5px;font-weight:500;color:var(--marino);margin-bottom:4px">🛡️ Escudo / Logo del municipio</div>
          <div style="font-size:11px;color:var(--texto-2);margin-bottom:12px">Se mostrará en la barra de navegación y en la pantalla de inicio de sesión.</div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
            <div id="escudoPreview" style="width:72px;height:72px;border-radius:50%;background:var(--marino);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;overflow:hidden;border:2px solid var(--borde)">
              ${localStorage.getItem("gt_escudo") ? `<img src="${localStorage.getItem("gt_escudo")}" style="width:100%;height:100%;object-fit:contain;padding:4px">` : "🏛️"}
            </div>
            <div style="flex:1">
              <div style="display:flex;gap:8px;margin-bottom:8px">
                <button class="btn-primary" onclick="CONFIG_APP._clickSubirEscudo()" style="font-size:12px;flex:1">
                  📤 Subir imagen
                </button>
                <button class="btn-secondary" onclick="CONFIG_APP._quitarEscudo()" style="font-size:12px">
                  ✕ Quitar
                </button>
              </div>
              <div class="form-group" style="margin-bottom:0">
                <label>O pega la URL de la imagen</label>
                <div style="display:flex;gap:6px">
                  <input type="url" id="escudoUrlInput" placeholder="https://..." value="${localStorage.getItem('gt_escudo_url') || ''}" style="font-size:11.5px">
                  <button class="btn-secondary" onclick="CONFIG_APP._usarUrlEscudo()" style="font-size:12px;flex-shrink:0;padding:0 10px">Usar</button>
                </div>
              </div>
            </div>
          </div>
          <input type="file" id="escudoFileInput" accept="image/*" style="display:none" onchange="CONFIG_APP._procesarEscudo(this)">
          <div id="escudoMsg" style="display:none;font-size:11px;border-radius:6px;padding:6px 10px"></div>
        </div>

        <!-- Identidad del municipio -->
        <div style="background:#fff;border:.5px solid var(--borde);border-radius:var(--radio);padding:1rem;margin-bottom:1.25rem">
          <div style="font-size:12.5px;font-weight:500;color:var(--marino);margin-bottom:12px">🏛️ Identidad del municipio</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="form-group">
              <label>Municipio</label>
              <input type="text" id="cfg_municipio" value="${cfg.municipio}" placeholder="Guatapé">
            </div>
            <div class="form-group">
              <label>Departamento</label>
              <input type="text" id="cfg_departamento" value="${cfg.departamento}" placeholder="Antioquia">
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label>Nombre del gobierno</label>
              <input type="text" id="cfg_gobierno" value="${cfg.gobierno}" placeholder="Juntos Construimos Guatapé">
            </div>
            <div class="form-group">
              <label>Período</label>
              <input type="text" id="cfg_periodo" value="${cfg.periodo}" placeholder="2024–2027">
            </div>
            <div class="form-group">
              <label>NIT</label>
              <input type="text" id="cfg_nit" value="${cfg.nit}" placeholder="890 983 830 - 3">
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label>Sitio web oficial</label>
              <input type="text" id="cfg_web" value="${cfg.web}" placeholder="municipiodeguatape.gov.co">
            </div>
          </div>
          <!-- Vista previa en tiempo real -->
          <div style="margin-top:10px;background:var(--marino);border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px">
            <div style="flex:1">
              <div id="prev_gobierno" style="font-size:12px;font-weight:500;color:#fff">${cfg.gobierno}</div>
              <div id="prev_periodo" style="font-size:10px;color:rgba(137,196,226,.6)">${cfg.periodo} · Observatorio municipal</div>
            </div>
            <div id="prev_badge" style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.07);border-radius:20px;padding:3px 10px;font-size:10px;color:rgba(255,255,255,.45)">
              <span style="width:5px;height:5px;border-radius:50%;background:var(--amarillo);display:inline-block"></span>
              Q1 2026
            </div>
          </div>
          <script>
            ['cfg_gobierno','cfg_periodo'].forEach(id => {
              document.getElementById(id)?.addEventListener('input', () => {
                document.getElementById('prev_gobierno').textContent = document.getElementById('cfg_gobierno').value;
                document.getElementById('prev_periodo').textContent  = document.getElementById('cfg_periodo').value + ' · Observatorio municipal';
              });
            });
          </script>
        </div>

        <!-- Paleta de colores -->
        <div style="background:#fff;border:.5px solid var(--borde);border-radius:var(--radio);padding:1rem;margin-bottom:1.25rem">
          <div style="font-size:12.5px;font-weight:500;color:var(--marino);margin-bottom:4px">🎨 Paleta de colores oficial</div>
          <div style="font-size:11px;color:var(--texto-2);margin-bottom:12px">
            Los colores deben corresponder al Manual de Identidad Visual del municipio.
            Los cambios se aplican en tiempo real.
          </div>

          <!-- Preview franja bandera -->
          <div id="prev_franja" style="height:10px;border-radius:5px;display:flex;overflow:hidden;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,.15)">
            <div id="pf1" style="flex:1;background:${cfg.color_azul}"></div>
            <div id="pf2" style="flex:1;background:${cfg.color_amarillo}"></div>
            <div id="pf3" style="flex:1;background:${cfg.color_verde}"></div>
            <div id="pf4" style="flex:1;background:${cfg.color_marino}"></div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">
            ${[
              ["cfg_color_azul",     cfg.color_azul,     "Azul claro",   "Predominante · botones · badges",     "pf1"],
              ["cfg_color_amarillo", cfg.color_amarillo, "Amarillo",     "Bandera · alertas · dot live",        "pf2"],
              ["cfg_color_verde",    cfg.color_verde,    "Verde",        "Bandera · estados OK",                "pf3"],
              ["cfg_color_marino",   cfg.color_marino,   "Azul marino",  "Bandera · navbar · texto principal",  "pf4"],
              ["cfg_color_gris",     cfg.color_gris,     "Gris",         "Complementario",                      ""],
            ].map(([id, val, nom, desc, pf]) => `
              <div>
                <div style="position:relative;margin-bottom:6px">
                  <input type="color" id="${id}" value="${val}"
                    style="width:100%;height:44px;border:none;border-radius:8px;cursor:pointer;padding:3px"
                    oninput="CONFIG_APP._previewColor('${id}','${pf}')">
                </div>
                <div style="font-size:11px;font-weight:500;color:var(--marino)">${nom}</div>
                <div style="font-size:9.5px;color:var(--texto-3);line-height:1.4">${desc}</div>
                <div id="${id}_hex" style="font-family:monospace;font-size:10px;color:var(--texto-2);margin-top:2px">${val}</div>
              </div>`).join("")}
          </div>

          <!-- Botones de paletas predefinidas -->
          <div style="margin-top:14px;padding-top:12px;border-top:.5px solid var(--borde)">
            <div style="font-size:11px;font-weight:500;color:var(--marino);margin-bottom:8px">Paletas predefinidas:</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${[
                ["Guatapé (actual)",  "#89C4E2","#FBDC08","#078838","#17272D","#606060"],
                ["Clásico municipal", "#2E6DA4","#F5A623","#1A7A3C","#1C2B3A","#707070"],
                ["Antioquia",         "#FFD700","#003087","#C8102E","#1B2A5C","#808080"],
                ["Verde naturaleza",  "#4CAF50","#FFC107","#1B5E20","#212121","#757575"],
                ["Océano",            "#0288D1","#F9A825","#00796B","#01579B","#546E7A"],
              ].map(([nom, az, am, vd, ma, gy]) => `
                <button onclick="CONFIG_APP._aplicarPaleta('${az}','${am}','${vd}','${ma}','${gy}')"
                  style="display:flex;gap:3px;align-items:center;border:.5px solid var(--borde);
                         background:#fff;border-radius:6px;padding:5px 9px;cursor:pointer;font-size:11px;
                         color:var(--texto-2);font-family:var(--font-s)">
                  <span style="display:flex;gap:2px">
                    ${[az,am,vd,ma].map(c=>`<span style="width:10px;height:10px;border-radius:2px;background:${c}"></span>`).join("")}
                  </span>
                  ${nom}
                </button>`).join("")}
            </div>
          </div>
        </div>

        <!-- Centro del mapa -->
        <div style="background:#fff;border:.5px solid var(--borde);border-radius:var(--radio);padding:1rem;margin-bottom:1.25rem">
          <div style="font-size:12.5px;font-weight:500;color:var(--marino);margin-bottom:12px">🗺️ Centro del mapa</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <div class="form-group">
              <label>Latitud</label>
              <input type="number" id="cfg_mapa_lat" value="${cfg.mapa_lat}" step="0.0001" placeholder="6.2321">
            </div>
            <div class="form-group">
              <label>Longitud</label>
              <input type="number" id="cfg_mapa_lng" value="${cfg.mapa_lng}" step="0.0001" placeholder="-75.1567">
            </div>
            <div class="form-group">
              <label>Zoom inicial</label>
              <input type="number" id="cfg_mapa_zoom" value="${cfg.mapa_zoom}" min="8" max="18" placeholder="13">
            </div>
          </div>
          <div style="font-size:11px;color:var(--texto-3);margin-top:4px">
            💡 Puedes encontrar las coordenadas en Google Maps haciendo clic derecho sobre el municipio.
          </div>
        </div>

        <!-- Editor de coordenadas de veredas -->
        <div style="background:#fff;border:.5px solid var(--borde);border-radius:var(--radio);padding:1rem;margin-bottom:1.25rem">
          <div style="font-size:12.5px;font-weight:500;color:var(--marino);margin-bottom:4px">📍 Coordenadas de veredas</div>
          <div style="font-size:11px;color:var(--texto-2);margin-bottom:10px">
            Corrige la posición de cada vereda en el mapa. Los valores se guardan localmente.<br>
            <strong>Tip:</strong> Busca la vereda en Google Maps, haz clic derecho → copia latitud y longitud.
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:11.5px" id="tablaVeredas">
              <thead>
                <tr style="background:var(--marino);color:#fff">
                  <th style="padding:7px 10px;text-align:left;font-weight:500;border-radius:6px 0 0 0">Vereda</th>
                  <th style="padding:7px 10px;text-align:left;font-weight:500">Latitud</th>
                  <th style="padding:7px 10px;text-align:left;font-weight:500">Longitud</th>
                  <th style="padding:7px 10px;text-align:left;font-weight:500;border-radius:0 6px 0 0">Color</th>
                </tr>
              </thead>
              <tbody>
                ${CONFIG_APP._filaVeredas()}
              </tbody>
            </table>
          </div>
          <div style="margin-top:10px;display:flex;gap:8px">
            <button class="btn-primary" onclick="CONFIG_APP._guardarVeredas()" style="font-size:12px;flex:1">
              💾 Guardar coordenadas de veredas
            </button>
            <button class="btn-secondary" onclick="CONFIG_APP._resetVeredas()" style="font-size:12px">
              ↩️ Restablecer
            </button>
          </div>
          <div id="verMsg" style="display:none;font-size:11px;border-radius:6px;padding:6px 10px;margin-top:8px"></div>
        </div>

        <!-- Botones de acción -->
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn-primary" onclick="CONFIG_APP.guardarYAplicar()" style="flex:2;padding:12px;font-size:13.5px">
            💾 Guardar configuración
          </button>
          <button class="btn-secondary" onclick="CONFIG_APP._restablecer()" style="flex:1;font-size:12px">
            ↩️ Restablecer valores originales
          </button>
        </div>
        <div id="cfg_status" style="display:none;margin-top:10px;border-radius:8px;padding:9px 12px;font-size:12px"></div>

      </div>`;
  },

  // Preview de color en tiempo real
  _previewColor(inputId, franjId) {
    const val = document.getElementById(inputId)?.value;
    if (!val) return;
    // Actualizar hex display
    const hexEl = document.getElementById(inputId + "_hex");
    if (hexEl) hexEl.textContent = val;
    // Actualizar franja preview
    if (franjId) {
      const el = document.getElementById(franjId);
      if (el) el.style.background = val;
    }
    // Aplicar color en tiempo real a la UI
    const map = {
      cfg_color_azul:     "--azul",
      cfg_color_amarillo: "--amarillo",
      cfg_color_verde:    "--verde",
      cfg_color_marino:   "--marino",
      cfg_color_gris:     "--gris"
    };
    if (map[inputId]) {
      document.documentElement.style.setProperty(map[inputId], val);
    }
  },

  // Aplicar paleta predefinida
  _aplicarPaleta(az, am, vd, ma, gy) {
    const campos = {
      cfg_color_azul: az, cfg_color_amarillo: am,
      cfg_color_verde: vd, cfg_color_marino: ma, cfg_color_gris: gy
    };
    const franja = { cfg_color_azul:"pf1", cfg_color_amarillo:"pf2", cfg_color_verde:"pf3", cfg_color_marino:"pf4" };
    Object.entries(campos).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) { el.value = val; this._previewColor(id, franja[id] || ""); }
    });
  },

  // Verificar URL del backend
  async _verificarURL() {
    const url    = document.getElementById("cfg_api_url")?.value?.trim();
    const status = document.getElementById("cfg_url_status");
    if (!status) return;
    status.style.display = "block";

    if (!url || !url.startsWith("https://script.google.com")) {
      status.style.cssText = "display:block;background:var(--rojo-50);color:var(--rojo);border-radius:6px;padding:7px 10px;font-size:11px;margin-top:8px";
      status.textContent = "❌ La URL debe empezar con https://script.google.com";
      return;
    }
    status.style.cssText = "display:block;background:var(--azul-50);color:var(--azul-dark);border-radius:6px;padding:7px 10px;font-size:11px;margin-top:8px";
    status.textContent = "🔌 Verificando conexión...";
    try {
      const t0 = Date.now();
      const r  = await fetch(url + "?action=verificar");
      const d  = await r.json();
      const ms = Date.now() - t0;
      if (d.ok) {
        status.style.cssText = "display:block;background:var(--verde-50);color:var(--verde);border-radius:6px;padding:7px 10px;font-size:11px;margin-top:8px";
        status.innerHTML = `✅ Conectado (${ms}ms) · Sheets: ${d.tiene_sheets?"✓":"✗"} · Drive: ${d.tiene_drive?"✓":"✗"} · Gemini: ${d.tiene_gemini?"✓":"⚠️ configura la API Key"}`;
      } else {
        status.style.cssText = "display:block;background:var(--rojo-50);color:var(--rojo);border-radius:6px;padding:7px 10px;font-size:11px;margin-top:8px";
        status.textContent = "❌ El servidor respondió con error: " + d.error;
      }
    } catch (err) {
      status.style.cssText = "display:block;background:var(--rojo-50);color:var(--rojo);border-radius:6px;padding:7px 10px;font-size:11px;margin-top:8px";
      status.textContent = "❌ Sin conexión: " + err.message;
    }
  },

  // Recoger todos los valores del formulario
  _recogerFormulario() {
    const v = id => document.getElementById(id)?.value?.trim() || "";
    return {
      municipio:     v("cfg_municipio"),
      departamento:  v("cfg_departamento"),
      gobierno:      v("cfg_gobierno"),
      periodo:       v("cfg_periodo"),
      nit:           v("cfg_nit"),
      web:           v("cfg_web"),
      mapa_lat:      v("cfg_mapa_lat"),
      mapa_lng:      v("cfg_mapa_lng"),
      mapa_zoom:     v("cfg_mapa_zoom"),
      color_azul:    v("cfg_color_azul"),
      color_amarillo:v("cfg_color_amarillo"),
      color_verde:   v("cfg_color_verde"),
      color_marino:  v("cfg_color_marino"),
      color_gris:    v("cfg_color_gris"),
      api_url:       v("cfg_api_url"),
    };
  },

  guardarYAplicar() {
    const cfg    = this._recogerFormulario();
    const status = document.getElementById("cfg_status");

    // Validaciones básicas
    if (!cfg.gobierno) {
      this._mostrarStatus("❌ El nombre del gobierno es obligatorio", "error"); return;
    }
    if (!cfg.municipio) {
      this._mostrarStatus("❌ El nombre del municipio es obligatorio", "error"); return;
    }

    this.guardar(cfg);
    this.aplicar(cfg);
    this._mostrarStatus("✅ Configuración guardada y aplicada correctamente. Los cambios se mantienen aunque cierres el navegador.", "ok");

    // Actualizar footer web
    const footerWeb = document.getElementById("footerWeb");
    if (footerWeb) footerWeb.textContent = cfg.web;

    // Si cambió la URL, recargar datos
    if (cfg.api_url && cfg.api_url !== localStorage.getItem("gt_api_url_prev")) {
      localStorage.setItem("gt_api_url_prev", cfg.api_url);
      setTimeout(() => {
        if (typeof APP !== "undefined") APP.cargarDatos();
        APP?.toast("🔄 Reconectando con el servidor...");
      }, 800);
    }
  },

  _restablecer() {
    if (!confirm("¿Restablecer todos los valores a los originales de Guatapé?\n\nEsto sobrescribirá tu configuración guardada.")) return;
    localStorage.removeItem(this._KEY);
    this.renderPanel();
    this.aplicar(this._defaults);
    this._mostrarStatus("↩️ Valores restablecidos a los originales de Guatapé", "ok");
  },

  _mostrarStatus(msg, tipo) {
    const el = document.getElementById("cfg_status");
    if (!el) return;
    const estilos = {
      ok:    "background:var(--verde-50);color:var(--verde);",
      error: "background:var(--rojo-50);color:var(--rojo);",
    };
    el.style.cssText = `display:block;border-radius:8px;padding:9px 12px;font-size:12px;${estilos[tipo]||estilos.ok}`;
    el.textContent = msg;
    if (tipo === "ok") setTimeout(() => el.style.display = "none", 4000);
  },

  // ── ESCUDO / LOGO ─────────────────────────────────────────────
  _aplicarEscudo(src) {
    const nav = document.getElementById("navEscudo");
    if (nav) { nav.src = src; nav.style.display = "block"; }
    const rol = document.getElementById("rolEscudo");
    if (rol) rol.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:contain;border-radius:50%">`;
  },

  _quitarEscudo() {
    localStorage.removeItem("gt_escudo");
    localStorage.removeItem("gt_escudo_url");
    const nav = document.getElementById("navEscudo");
    if (nav) { nav.src = ""; nav.style.display = "none"; }
    const rol = document.getElementById("rolEscudo");
    if (rol) rol.innerHTML = "🏛️";
    const prev = document.getElementById("escudoPreview");
    if (prev) prev.innerHTML = "🏛️";
    this._msgEscudo("Escudo eliminado.", "ok");
  },

  _clickSubirEscudo() {
    document.getElementById("escudoFileInput")?.click();
  },

  _procesarEscudo(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      this._msgEscudo("⚠️ Imagen muy grande (+300 KB). Usa una versión reducida o pega la URL.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target.result;
      localStorage.setItem("gt_escudo", src);
      this._aplicarEscudo(src);
      const prev = document.getElementById("escudoPreview");
      if (prev) prev.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:contain;padding:4px">`;
      this._msgEscudo("✅ Escudo cargado correctamente.", "ok");
    };
    reader.readAsDataURL(file);
  },

  _usarUrlEscudo() {
    const url = document.getElementById("escudoUrlInput")?.value?.trim();
    if (!url || !url.startsWith("http")) {
      this._msgEscudo("❌ Ingresa una URL válida.", "error"); return;
    }
    localStorage.setItem("gt_escudo", url);
    localStorage.setItem("gt_escudo_url", url);
    this._aplicarEscudo(url);
    const prev = document.getElementById("escudoPreview");
    if (prev) prev.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:contain;padding:4px">`;
    this._msgEscudo("✅ Escudo aplicado desde URL.", "ok");
  },

  _msgEscudo(txt, tipo) {
    const el = document.getElementById("escudoMsg");
    if (!el) return;
    el.style.cssText = `display:block;font-size:11px;border-radius:6px;padding:6px 10px;${
      tipo === "ok" ? "background:var(--verde-50);color:var(--verde)" : "background:var(--rojo-50);color:var(--rojo)"
    }`;
    el.textContent = txt;
    if (tipo === "ok") setTimeout(() => el.style.display = "none", 3000);
  },

  // ── VEREDAS ───────────────────────────────────────────────────
  _verDefaults: {
    "La Sonadora":            { lat: 6.1987, lng: -75.1779, color: "#2ECC71" },
    "La Peña":                { lat: 6.2198, lng: -75.1953, color: "#3498DB" },
    "La Piedra":              { lat: 6.2218, lng: -75.1432, color: "#F39C12" },
    "Quebrada Arriba":        { lat: 6.2672, lng: -75.1792, color: "#E67E22" },
    "Los Naranjos":           { lat: 6.2549, lng: -75.1934, color: "#9B59B6" },
    "El Roble":               { lat: 6.2573, lng: -75.1648, color: "#1ABC9C" },
    "El Tronco / El Rosario": { lat: 6.1953, lng: -75.1632, color: "#E74C3C" },
    "Urbano":                 { lat: 6.2321, lng: -75.1567, color: "#34495E" },
  },

  _getVeredas() {
    const saved = localStorage.getItem("gt_veredas_override");
    const override = saved ? JSON.parse(saved) : {};
    const merged = { ...this._verDefaults };
    Object.entries(override).forEach(([n, v]) => { if (merged[n]) merged[n] = { ...merged[n], ...v }; });
    return merged;
  },

  _filaVeredas() {
    const ver = this._getVeredas();
    return Object.entries(ver).map(([nombre, v]) => `
      <tr style="border-bottom:.5px solid var(--borde)">
        <td style="padding:6px 10px;font-weight:500;color:var(--marino);white-space:nowrap">${nombre}</td>
        <td style="padding:4px 6px">
          <input type="number" step="0.0001" data-ver="${nombre}" data-campo="lat" value="${v.lat}"
            style="width:100px;font-family:monospace;font-size:11px;padding:4px 6px;border:.5px solid var(--borde);border-radius:5px;background:#f9f9f9">
        </td>
        <td style="padding:4px 6px">
          <input type="number" step="0.0001" data-ver="${nombre}" data-campo="lng" value="${v.lng}"
            style="width:110px;font-family:monospace;font-size:11px;padding:4px 6px;border:.5px solid var(--borde);border-radius:5px;background:#f9f9f9">
        </td>
        <td style="padding:4px 6px">
          <input type="color" data-ver="${nombre}" data-campo="color" value="${v.color}"
            style="width:44px;height:28px;border:none;border-radius:5px;cursor:pointer;padding:2px">
        </td>
      </tr>`).join("");
  },

  _guardarVeredas() {
    const tabla = document.getElementById("tablaVeredas");
    if (!tabla) return;
    const override = {};
    tabla.querySelectorAll("input[data-ver]").forEach(inp => {
      const v = inp.dataset.ver, c = inp.dataset.campo;
      if (!override[v]) override[v] = {};
      override[v][c] = c === "color" ? inp.value : parseFloat(inp.value);
    });
    localStorage.setItem("gt_veredas_override", JSON.stringify(override));
    // Invalidar cache de config para que el mapa tome las nuevas coords
    if (typeof API !== "undefined") { API._config = null; API._cache = {}; }
    const el = document.getElementById("verMsg");
    if (el) {
      el.style.cssText = "display:block;font-size:11px;border-radius:6px;padding:6px 10px;background:var(--verde-50);color:var(--verde)";
      el.textContent = "✅ Coordenadas guardadas. Recarga el mapa para ver los cambios.";
      setTimeout(() => el.style.display = "none", 4000);
    }
  },

  _resetVeredas() {
    if (!confirm("¿Restablecer todas las coordenadas de veredas a los valores predeterminados?")) return;
    localStorage.removeItem("gt_veredas_override");
    if (typeof API !== "undefined") { API._config = null; API._cache = {}; }
    this.renderPanel();
  }
};
