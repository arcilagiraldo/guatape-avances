// ══════════════════════════════════════════════════════
// API · v2.2
// ══════════════════════════════════════════════════════
const API = {
  _token:     localStorage.getItem("gt"),
  _config:    null,
  _cache:     {},
  _CACHE_TTL: 2 * 60 * 1000,

  // ── GET con caché ─────────────────────────────────────
  _esModoLocal() {
    return !APP_CONFIG.API_URL || APP_CONFIG.API_URL.includes("PEGA_AQUI");
  },

  _filtrarLocal(d, p) {
    const sec  = p.secretaria && p.secretaria !== "todas"  ? p.secretaria : null;
    const anio = p.anio       && p.anio       !== "todos"  ? String(p.anio) : null;
    const trim = p.trimestre  && p.trimestre  !== "todos"  ? String(p.trimestre) : null;
    if (!sec && !anio && !trim) return d;
    const filtrar = arr => (arr || []).filter(x =>
      (!sec  || x.secretaria === sec)  &&
      (!anio || String(x.anio) === anio) &&
      (!trim || String(x.trimestre) === trim)
    );
    return { ...d,
      programas:     filtrar(d.programas),
      beneficiarios: filtrar(d.beneficiarios),
      contratos:     filtrar(d.contratos),
    };
  },

  async get(p = {}) {
    // ── DATOS LOCALES: usa datos locales si la URL no está configurada ──
    if (this._esModoLocal()) {
      if (typeof DATOS_INICIALES === "undefined") return { ok: false, error: "Sin URL de API configurada." };
      if (!p.action || p.action === "datos")  return this._filtrarLocal(DATOS_INICIALES, p);
      if (p.action === "config")              return API._configDemo();
      return { ok: true };
    }

    const q   = new URLSearchParams(p).toString();
    const url = APP_CONFIG.API_URL + (q ? "?" + q : "");
    const now = Date.now();
    if (this._cache[url] && (now - this._cache[url].ts) < this._CACHE_TTL)
      return this._cache[url].data;
    try {
      const r    = await fetch(url);
      const data = await r.json();
      if (data.ok) this._cache[url] = { data, ts: now };
      return data;
    } catch (e) {
      if (this._cache[url]) return this._cache[url].data;
      return { ok: false, error: "Sin conexión con el servidor.", offline: true };
    }
  },

  _configDemo() {
    return {
      ok: true,
      municipio: APP_CONFIG.MUNICIPIO,
      gobierno:  APP_CONFIG.GOBIERNO,
      periodo:   APP_CONFIG.PERIODO,
      secretarias: [
        { id:"medio_ambiente", nombre:"Sec. Medio Ambiente y Desarrollo Rural", color:"#027034", icono:"🌿" },
        { id:"gobierno",       nombre:"Sec. de Gobierno",                        color:"#163040", icono:"⚖️" },
        { id:"bienestar",      nombre:"Sec. Bienestar y Desarrollo Social",      color:"#993556", icono:"🤝" },
        { id:"turismo",        nombre:"Sec. de Turismo",                         color:"#D5B854", icono:"🏔️" },
        { id:"planeacion",     nombre:"Sec. de Planeación",                      color:"#534AB7", icono:"📐" },
        { id:"hacienda",       nombre:"Sec. de Hacienda",                        color:"#2D6A4F", icono:"💰" },
      ],
      veredas: {
        "La Sonadora":     {"lat":6.1900,"lng":-75.2000,"color":"#2ECC71"},
        "La Peña":         {"lat":6.2050,"lng":-75.1780,"color":"#3498DB"},
        "La Piedra":       {"lat":6.2194,"lng":-75.1792,"color":"#F39C12"},
        "Quebrada Arriba": {"lat":6.2680,"lng":-75.1380,"color":"#E67E22"},
        "Los Naranjos":    {"lat":6.2526,"lng":-75.1669,"color":"#9B59B6"},
        "El Roble":        {"lat":6.2430,"lng":-75.1700,"color":"#1ABC9C"},
        "El Rosario":      {"lat":6.2720,"lng":-75.1150,"color":"#E74C3C"},
        "El Tronco":       {"lat":6.2350,"lng":-75.1050,"color":"#795548"},
        "Urbano":          {"lat":6.2311,"lng":-75.1535,"color":"#34495E"}
      },
      iconos: {
        forestal:{"emoji":"🌳","label":"Conservación forestal"},
        agroecologia:{"emoji":"🥬","label":"Agroecología"},
        agricola:{"emoji":"🌽","label":"Agricultura"},
        agua:{"emoji":"💧","label":"Agua y saneamiento"},
        vivienda:{"emoji":"🏡","label":"Vivienda rural"},
        ambiente:{"emoji":"🌿","label":"Medio Ambiente"},
        infraestructura:{"emoji":"🏗️","label":"Infraestructura"},
        seguridad:{"emoji":"🛡️","label":"Seguridad"},
        fauna:{"emoji":"🐾","label":"Fauna doméstica"},
        social:{"emoji":"🤝","label":"Desarrollo Social"},
        general:{"emoji":"📋","label":"Programa general"}
      }
    };
  },

  // ── POST ──────────────────────────────────────────────
  async post(b = {}) {
    if (this._esModoLocal()) {
      if (b.action === "login") return { ok:false, error:"La app está en modo local. Configura API_URL para acceder al panel admin." };
      return { ok:false, error:"Modo demo activo: operaciones de escritura deshabilitadas." };
    }
    try {
      // Content-Type: text/plain evita el preflight CORS (solicitud simple).
      // Apps Script ejecuta doPost antes del redirect 302; el redirect solo entrega el resultado.
      const r = await fetch(APP_CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...b, token: this._token })
      });
      return await r.json();
    } catch (e) {
      return { ok: false, error: "Error de conexión: " + e.message };
    }
  },

  // ── Auth ──────────────────────────────────────────────
  async login(u, p) {
    const r = await this.post({ action: "login", usuario: u, password: p });
    if (r.ok) {
      this._token = r.token;
      localStorage.setItem("gt",  r.token);
      localStorage.setItem("gts", JSON.stringify({
        secretaria: r.secretaria, nombre: r.nombre,
        esSuperAdmin: r.esSuperAdmin, esDocumentador: r.esDocumentador || false
      }));
    }
    return r;
  },
  async logout() {
    await this.post({ action: "logout" });
    this._token = null; this._cache = {};
    localStorage.removeItem("gt"); localStorage.removeItem("gts");
  },
  getSession()   { const s = localStorage.getItem("gts"); return s ? JSON.parse(s) : null; },
  estaLogueado() { return !!this._token && !!this.getSession(); },

  // ── Config & datos ────────────────────────────────────
  async getConfig() {
    if (this._config) return this._config;
    const r = await this.get({ action: "config" });
    if (r.ok) {
      // Mezclar coordenadas de veredas corregidas desde localStorage
      const ov = localStorage.getItem("gt_veredas_override");
      if (ov && r.veredas) {
        try {
          const overrides = JSON.parse(ov);
          Object.entries(overrides).forEach(([n, v]) => {
            if (r.veredas[n]) r.veredas[n] = { ...r.veredas[n], ...v };
          });
        } catch (_) {}
      }
      this._config = r;
    }
    return r;
  },
  async getDatos(f = {}) {
    Object.keys(this._cache).forEach(k => { if (k.includes("action=datos")) delete this._cache[k]; });
    return this.get({ action:"datos", anio:f.anio||"todos", trimestre:f.trimestre||"todos", secretaria:f.secretaria||"todas" });
  },

  // ── Carga de planes ───────────────────────────────────
  async cargarPlanDesarrollo({ secretaria, base64Excel }) {
    return this.post({ action: "cargar_pd", secretaria, base64Excel });
  },
  async cargarPlanAccion({ secretaria, anio, base64Excel }) {
    return this.post({ action: "cargar_pa", secretaria, anio, base64Excel });
  },

  // ── Informes trimestrales (array de {base64, nombre}) ─
  async subirInformes({ secretaria, anio, trimestre, pdfs }) {
    return this.post({ action: "subir_informe", secretaria, anio, trimestre, pdfs });
  },

  // ── Soportes de contratos ─────────────────────────────
  async subirSoportes({ secretaria, anio, trimestre, soportes }) {
    return this.post({ action: "subir_soportes", secretaria, anio, trimestre, soportes });
  },

  // ── Edición ───────────────────────────────────────────
  async actualizarCoordenada(id, lat, lng) {
    return this.post({ action: "actualizar_coordenada", id, lat, lng });
  },
  async agregarBeneficiario(d) {
    return this.post({ action: "agregar_beneficiario", ...d });
  },
  async confirmarVeredas(confirmaciones) {
    return this.post({ action: "confirmar_veredas", confirmaciones });
  },

  // ── Utilidades ────────────────────────────────────────
  fileToBase64(f) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(f);
    });
  },
  async filesToBase64Array(files) {
    const arr = [];
    for (const f of files) {
      const base64 = await this.fileToBase64(f);
      arr.push({ base64, nombre: f.name, tamaño: f.size });
    }
    return arr;
  },

  fmtPeso(v) {
    if (!v || isNaN(v)) return "—";
    const n = parseFloat(v);
    if (n >= 1e9) return "$" + (n/1e9).toFixed(1) + "B";
    if (n >= 1e6) return "$" + (n/1e6).toFixed(0) + "M";
    if (n >= 1e3) return "$" + (n/1e3).toFixed(0) + "K";
    return "$" + n.toLocaleString("es-CO");
  },
  fmtPesoFull(v) {
    if (!v || isNaN(v)) return "—";
    return "$" + parseFloat(v).toLocaleString("es-CO");
  },
  fmtFecha(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" });
  },
  fmtPct(v) {
    const n = parseFloat(v) || 0;
    return (Number.isInteger(n) ? n : n.toFixed(1)) + "%";
  }
};
