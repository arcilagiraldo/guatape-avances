// ══════════════════════════════════════════════════════
// APP · v2.1 — Controlador principal
// ══════════════════════════════════════════════════════
const APP = {
  _datos:   null,
  _config:  null,
  _seccion: "dashboard",

  async init() {
    try {
    // Inicializar configuración guardada ANTES de todo lo demás
    if (typeof CONFIG_APP !== "undefined") CONFIG_APP.init();
    this._identidad();
    this._nav();
    this._filtros();
    this._cargando();

    const [cfg, dat] = await Promise.all([
      API.getConfig(),
      API.getDatos({ anio: "todos", trimestre: "todos", secretaria: "todas" })
    ]);

    if (!cfg.ok) {
      document.getElementById("inicioContenido").innerHTML = `
        <div style="text-align:center;padding:5rem 2rem;color:var(--texto-3)">
          <div style="font-size:48px;margin-bottom:1rem;">⚠️</div>
          <div style="font-size:15px;font-weight:500;color:var(--rojo);margin-bottom:8px">Error al cargar la configuración</div>
          <div style="font-size:12px;color:var(--texto-3);max-width:400px;margin:0 auto;line-height:1.7">${cfg.error || "No se pudo conectar con el servidor."}</div>
          <button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;background:var(--verde);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">🔄 Reintentar</button>
        </div>`;
      return;
    }
    if (!dat.ok) {
      document.getElementById("inicioContenido").innerHTML = `
        <div style="text-align:center;padding:5rem 2rem;color:var(--texto-3)">
          <div style="font-size:48px;margin-bottom:1rem;">⚠️</div>
          <div style="font-size:15px;font-weight:500;color:var(--rojo);margin-bottom:8px">Error al cargar los datos</div>
          <div style="font-size:12px;color:var(--texto-3);max-width:400px;margin:0 auto;line-height:1.7">${dat.error || "No se pudieron obtener los datos del municipio."}</div>
          <button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;background:var(--verde);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">🔄 Reintentar</button>
        </div>`;
      return;
    }

    this._config = cfg;
    this._datos  = dat;

    this._poblarSecs(cfg?.secretarias || []);
    this._render("dashboard");
    this._badge(dat?.ultimaActualizacion);

    ADMIN.init();

    // Asistente de instalación: se activa si la URL no está configurada
    if (typeof SETUP !== "undefined") SETUP.verificarYMostrar();

    // Auto-refresh cada 5 minutos
    setInterval(() => this.cargarDatos(), 5 * 60 * 1000);
    } catch (e) {
      console.error("[APP] Error fatal en init:", e);
      document.getElementById("inicioContenido").innerHTML = `
        <div style="text-align:center;padding:5rem 2rem;">
          <div style="font-size:48px;margin-bottom:1rem;">⚠️</div>
          <div style="font-size:15px;font-weight:500;color:var(--rojo);margin-bottom:8px">Error inesperado al iniciar la app</div>
          <div style="font-size:12px;color:var(--texto-3);max-width:400px;margin:0 auto">${e.message}</div>
          <button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;background:var(--verde);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">🔄 Reintentar</button>
        </div>`;
    }
  },

  _identidad() {
    // CONFIG_APP ya aplicó colores y textos si existe; aquí solo sync APP_CONFIG
    const cfg = typeof CONFIG_APP !== "undefined" ? CONFIG_APP.cargar() : null;
    if (cfg) {
      APP_CONFIG.GOBIERNO    = cfg.gobierno    || APP_CONFIG.GOBIERNO;
      APP_CONFIG.MUNICIPIO   = cfg.municipio   || APP_CONFIG.MUNICIPIO;
      APP_CONFIG.PERIODO     = cfg.periodo     || APP_CONFIG.PERIODO;
      APP_CONFIG.MAPA_CENTER = [parseFloat(cfg.mapa_lat)||6.2321, parseFloat(cfg.mapa_lng)||-75.1567];
      APP_CONFIG.MAPA_ZOOM   = parseInt(cfg.mapa_zoom)||13;
      if (cfg.api_url) APP_CONFIG.API_URL = cfg.api_url;
    }
    document.title = APP_CONFIG.GOBIERNO + " " + APP_CONFIG.PERIODO + " · Observatorio Municipal";
  },

  _nav() {
    // Nav desktop
    // NOTA DE SEGURIDAD: el panel admin (sección "admin") es accesible
    // a través del botón ⚙️, pero el contenido está protegido por login.
    // Los visitantes ven solo las secciones públicas: mapa, logros,
    // cuatrienio, contratos y biblioteca. El botón 🔒 Admin en la navbar
    // solo aparece cuando el usuario tiene sesión iniciada (admin-only).
    document.querySelectorAll(".nav-btn[data-section]").forEach(b =>
      b.addEventListener("click", () => this._ir(b.dataset.section))
    );
    document.getElementById("btnAdminToggle")?.addEventListener("click", () => this._ir("admin"));

    // Nav mobile
    document.querySelectorAll(".mobile-nav-btn[data-section]").forEach(b =>
      b.addEventListener("click", () => this._ir(b.dataset.section))
    );
  },

  _ir(sec) {
    this._seccion = sec;

    // Actualizar botones desktop
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelector(`.nav-btn[data-section="${sec}"]`)?.classList.add("active");

    // Actualizar botones mobile
    document.querySelectorAll(".mobile-nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelector(`.mobile-nav-btn[data-section="${sec}"]`)?.classList.add("active");

    // Cambiar sección visible
    document.querySelectorAll(".seccion").forEach(s => s.classList.remove("active"));
    document.getElementById("sec-" + sec)?.classList.add("active");

    if (this._datos && this._config) this._render(sec);
  },

  _filtros() {
    document.getElementById("btnFiltrar")?.addEventListener("click", () => this.cargarDatos());
  },

  _poblarSecs(secs) {
    const sel = document.getElementById("filtroSecretaria");
    if (!sel) return;
    secs.forEach(s => {
      const o = document.createElement("option");
      o.value = s.id;
      o.textContent = s.icono + " " + s.nombre;
      sel.appendChild(o);
    });
  },

  async cargarDatos() {
    const f = {
      anio:       document.getElementById("filtroAnio")?.value       || "todos",
      trimestre:  document.getElementById("filtroTrimestre")?.value  || "todos",
      secretaria: document.getElementById("filtroSecretaria")?.value || "todas"
    };
    const dat = await API.getDatos(f);
    if (dat.ok) {
      this._datos = dat;
      this._render(this._seccion);
      this._badge(dat.ultimaActualizacion);
    } else {
      this.toast("⚠️ " + (dat.error || "Error al actualizar los datos"), "error");
    }
  },

  _render(sec) {
    if (!this._datos || !this._config) return;
    try {
      switch (sec) {
        case "dashboard":  DASHBOARD.render(this._datos, this._config);  break;
        case "mapa":       MAPA.init(this._datos, this._config);         break;
        case "logros":     LOGROS.render(this._datos, this._config);     break;
        case "cuatrienio": CUATRIENIO.render(this._datos, this._config); break;
        case "contratos":  CONTRATOS.render(this._datos, this._config);  break;
        case "biblioteca": BIBLIOTECA.render(this._datos, this._config); break;
        case "publica":    DASHBOARD.render(this._datos, this._config);  break;
        case "admin":
          ADMIN.init();
          if (API.estaLogueado()) setTimeout(() => MAPA_EDITOR.init(this._datos, this._config), 400);
          break;
      }
    } catch (e) {
      this.toast("⚠️ Error al renderizar " + sec + ": " + e.message, "error");
      console.error("[APP] Error en _render(" + sec + "):", e);
    }
  },

  _cargando() {
    document.getElementById("mapa").innerHTML = `
      <div style="height:100%;display:flex;align-items:center;justify-content:center;background:#f0f0f0;flex-direction:column;gap:12px;">
        <div style="width:40px;height:40px;border:3px solid var(--verde);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>
        <p style="font-size:13px;color:#5F5E5A;">Cargando datos del municipio...</p>
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
  },

  _badge(ts) {
    const el = document.getElementById("actualizacionTexto");
    if (!el) return;
    if (!ts) { el.textContent = "Sin datos aún"; return; }
    const d    = new Date(ts);
    const diff = Math.round((new Date() - d) / 60000);
    el.textContent = diff < 1   ? "Actualizado ahora"
      : diff < 60  ? "Hace " + diff + " min"
      : "Actualizado " + d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  },

  toast(msg, tipo = "ok") {
    const el = document.getElementById("toast");
    el.textContent   = msg;
    el.style.background = tipo === "error" ? "#A32D2D" : "#2C2C2A";
    el.classList.remove("hidden");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add("hidden"), 3500);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  APP.init();
  if (typeof ROL !== "undefined") { ROL._eventos(); ROL.init(); }
});
