// ══════════════════════════════════════════════════════════════
// ADMIN · v2.4
// Panel administrativo con soporte de carga masiva histórica
// ══════════════════════════════════════════════════════════════

const ADMIN = {
  _session: null,

  init() {
    this._session = API.getSession();
    if (this._session) this._panel();
    else               this._login();
    this._eventos();
  },

  // ── Login / Logout ─────────────────────────────────────────
  _login() {
    document.getElementById("adminLogin").classList.remove("hidden");
    document.getElementById("adminPanel").classList.add("hidden");
  },

  _panel() {
    document.getElementById("adminLogin").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    document.getElementById("adminBienvenida").textContent = "Bienvenido, " + this._session.nombre;
    document.getElementById("adminSecretaria").textContent = this._session.esSuperAdmin
      ? "Documentador general — acceso total"
      : this._session.esDocumentador
      ? "Documentador — todas las secretarías"
      : "Secretaría: " + this._nomSec(this._session.secretaria);
    document.querySelectorAll(".admin-only").forEach(e => e.classList.remove("hidden"));

    // Selector de secretaría para superadmin y documentadores
    const rowSec = document.getElementById("rowSecretaria");
    if (rowSec) {
      const puedeElegir = this._session.esSuperAdmin || this._session.esDocumentador;
      rowSec.style.display = puedeElegir ? "block" : "none";
    }

    this._cargarResumen();
    this._cargarHistorial();
    this._irTab("tab-informe");
  },

  _nomSec(id) {
    const m = {
      medio_ambiente:"Medio Ambiente", gobierno:"Gobierno",
      bienestar:"Bienestar Social",    turismo:"Turismo",
      planeacion:"Planeación",         hacienda:"Hacienda"
    };
    return m[id] || id;
  },

  _getSec() {
    const puedeElegir = this._session?.esSuperAdmin || this._session?.esDocumentador;
    if (puedeElegir) return document.getElementById("uploadSecretaria")?.value || "";
    return this._session?.secretaria || "";
  },

  // ── Eventos ────────────────────────────────────────────────
  _eventos() {
    document.getElementById("btnLogin")?.addEventListener("click", () => this._doLogin());
    document.getElementById("loginPassword")?.addEventListener("keydown", e => {
      if (e.key === "Enter") this._doLogin();
    });
    document.getElementById("btnLogout")?.addEventListener("click", async () => {
      await API.logout();
      this._session = null;
      this._login();
      document.querySelectorAll(".admin-only").forEach(e => e.classList.add("hidden"));
      APP.toast("Sesión cerrada");
    });

    // Tabs
    document.querySelectorAll(".admin-tab-btn").forEach(btn =>
      btn.addEventListener("click", () => this._irTab(btn.dataset.tab))
    );

    // Dropzones — carga normal
    this._dropzone("dropPD",      "inputPD",      "nombrePD",      "single");
    this._dropzone("dropPA",      "inputPA",      "nombrePA",      "single");
    this._dropzone("dropSoportes","inputSoportes","nombreSoportes","multi");

    // Botones normales
    document.getElementById("btnCargarPD")?.addEventListener("click",    () => this._cargarPD());
    document.getElementById("btnCargarPA")?.addEventListener("click",    () => this._cargarPA());
    document.getElementById("btnSubirSoportes")?.addEventListener("click",() => this._subirSoportes());
    document.getElementById("btnEliminarPeriodo")?.addEventListener("click", () => this._confirmarEliminar());
    document.getElementById("btnAgregarBenef")?.addEventListener("click", () => this._modalBenef());

    // ── Carga masiva ──────────────────────────────────────────
    this._initCargaMasiva();
  },

  _irTab(tabId) {
    document.querySelectorAll(".admin-tab-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.tab === tabId)
    );
    document.querySelectorAll(".admin-tab-panel").forEach(p =>
      p.classList.toggle("hidden", p.id !== tabId)
    );
    if (tabId === "tab-configuracion" && typeof CONFIG_APP !== "undefined") {
      CONFIG_APP.renderPanel();
    }
    if (tabId === "tab-historico") {
      this._initCargaMasiva();
    }
    if (tabId === "tab-validacion" && typeof VALIDACION !== "undefined") {
      VALIDACION.renderPanel();
    }
  },

  // ── Login ──────────────────────────────────────────────────
  async _doLogin() {
    const u   = document.getElementById("loginUsuario").value.trim();
    const p   = document.getElementById("loginPassword").value;
    const err = document.getElementById("loginError");
    const btn = document.getElementById("btnLogin");
    if (!u || !p) { err.textContent = "Completa usuario y contraseña."; err.classList.remove("hidden"); return; }
    btn.textContent = "Ingresando..."; btn.disabled = true;
    const r = await API.login(u, p);
    btn.textContent = "Ingresar"; btn.disabled = false;
    if (r.ok) {
      this._session = API.getSession();
      this._panel();
      APP.toast("✅ Bienvenido, " + r.nombre);
      err.classList.add("hidden");
    } else {
      err.textContent = r.error || "Error al iniciar sesión";
      err.classList.remove("hidden");
    }
  },

  // ── Resumen y historial ────────────────────────────────────
  async _cargarResumen() {
    const r = await API.post({ action: "resumen_admin" });
    if (!r.ok) return;
    const c = r.conteos || {};
    const grid = document.getElementById("adminResumenGrid");
    if (!grid) return;
    grid.innerHTML = [
      { n: c.metas_pd      || 0, l: "Indicadores PD", ico: "🏁" },
      { n: c.metas_pa      || 0, l: "Programas PA",   ico: "📋" },
      { n: c.programas     || 0, l: "Avances cargados",ico:"📊" },
      { n: c.beneficiarios || 0, l: "Beneficiarios",  ico: "👥" },
      { n: c.contratos     || 0, l: "Contratos",      ico: "💰" },
      { n: c.biblioteca    || 0, l: "Documentos",     ico: "📁" },
    ].map(x => `<div class="admin-stat"><div style="font-size:16px">${x.ico}</div><div class="n">${x.n}</div><div class="l">${x.l}</div></div>`).join("");
  },

  async _cargarHistorial() {
    const r    = await API.post({ action: "estado_proceso" });
    const cont = document.getElementById("historialLista");
    if (!cont) return;
    const lista = r.registros || [];
    if (!lista.length) {
      cont.innerHTML = `<div class="empty-state"><div class="empty-state-desc">Aún no hay procesos registrados.</div></div>`;
      return;
    }
    cont.innerHTML = lista.map(p => {
      const fecha = p.timestamp ? new Date(p.timestamp).toLocaleString("es-CO",
        { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "—";
      return `<div class="historial-item">
        <div class="h-estado ${p.estado}">${p.estado}</div>
        <div class="h-msg">${p.mensaje||"—"}</div>
        <div class="h-fecha">${fecha}</div>
      </div>`;
    }).join("");
  },

  // ── Dropzones ──────────────────────────────────────────────
  _files: { pd: null, pa: null, soportes: [] },

  _dropzone(zId, iId, nId, modo) {
    const z   = document.getElementById(zId);
    const inp = document.getElementById(iId);
    const nom = document.getElementById(nId);
    if (!z || !inp) return;
    if (modo === "multi") inp.multiple = true;

    const set = files => {
      if (!files.length) return;
      if (modo === "single") {
        if (zId === "dropPD")    this._files.pd      = files[0];
        if (zId === "dropPA")    this._files.pa      = files[0];
        nom.textContent = "✅ " + files[0].name;
        document.getElementById(zId === "dropPD" ? "btnCargarPD" : "btnCargarPA").disabled = false;
      } else {
        this._files.soportes = [...files];
        nom.textContent = files.length === 1 ? "✅ " + files[0].name : `✅ ${files.length} archivos`;
        document.getElementById("btnSubirSoportes").disabled = false;
      }
      nom.classList.remove("hidden");
      z.classList.add("tiene-archivo");
    };

    z.addEventListener("click", () => inp.click());
    z.addEventListener("dragover",  e => { e.preventDefault(); z.classList.add("drag-over"); });
    z.addEventListener("dragleave", () => z.classList.remove("drag-over"));
    z.addEventListener("drop", e => { e.preventDefault(); z.classList.remove("drag-over"); set([...e.dataTransfer.files]); });
    inp.addEventListener("change", () => set([...inp.files]));
  },

  // ── PD / PA / Soportes (carga individual normal) ───────────
  async _cargarPD() {
    const sec = this._getSec();
    if (!sec)              { APP.toast("❌ Selecciona la secretaría", "error"); return; }
    if (!this._files.pd)   { APP.toast("❌ Selecciona el Excel del PD", "error"); return; }
    const btn = document.getElementById("btnCargarPD");
    btn.disabled = true; btn.textContent = "Procesando...";
    const L = m => this._termLog("terminalPD", m);
    L("📊 Leyendo Excel..."); const b64 = await API.fileToBase64(this._files.pd);
    L("☁️ Enviando al servidor...");
    const r = await API.cargarPlanDesarrollo({ secretaria: sec, base64Excel: b64 });
    (r.log||[]).forEach(l => L(l.msg));
    if (r.ok) { L("✅ " + r.indicadores + " indicadores cargados"); APP.toast("✅ PD cargado"); this._cargarResumen(); }
    else      { L("❌ " + r.error); APP.toast("❌ Error cargando PD", "error"); }
    btn.disabled = false; btn.textContent = "📥 Cargar Plan de Desarrollo";
  },

  async _cargarPA() {
    const sec  = this._getSec();
    const anio = document.getElementById("paAnio")?.value;
    if (!sec)            { APP.toast("❌ Selecciona la secretaría", "error"); return; }
    if (!this._files.pa) { APP.toast("❌ Selecciona el Excel del PA", "error"); return; }
    const btn = document.getElementById("btnCargarPA");
    btn.disabled = true; btn.textContent = "Procesando...";
    const L = m => this._termLog("terminalPA", m);
    L("📊 Leyendo Excel..."); const b64 = await API.fileToBase64(this._files.pa);
    L("☁️ Enviando al servidor...");
    const r = await API.cargarPlanAccion({ secretaria: sec, anio, base64Excel: b64 });
    (r.log||[]).forEach(l => L(l.msg));
    if (r.ok) { L("✅ " + r.programas + " programas cargados"); APP.toast("✅ PA " + anio + " cargado"); this._cargarResumen(); }
    else      { L("❌ " + r.error); APP.toast("❌ Error cargando PA", "error"); }
    btn.disabled = false; btn.textContent = "📥 Cargar Plan de Acción";
  },

  async _subirSoportes() {
    const sec   = this._getSec();
    const anio  = document.getElementById("uploadAnio")?.value;
    const trim  = document.getElementById("uploadTrimestre")?.value;
    const files = this._files.soportes;
    if (!sec || !files.length) { APP.toast("❌ Selecciona secretaría y soportes", "error"); return; }

    CARGA_MASIVA.limpiar();
    files.forEach(f => CARGA_MASIVA.encolar([f], CARGA_MASIVA.TIPOS.SOPORTE_PDF, { secretaria:sec, anio, trimestre:trim }));
    await CARGA_MASIVA.iniciar(() => { this._cargarResumen(); this._cargarHistorial(); });
  },

  // ── Carga trimestral individual (tab informe) ───────────────
  // Ahora usa CARGA_MASIVA internamente
  _initInforme() {
    const dropInformes = document.getElementById("dropInformes");
    const inputInformes = document.getElementById("inputInformes");
    const nombreInformes = document.getElementById("nombreInformes");
    if (!dropInformes || !inputInformes) return;

    inputInformes.multiple = true;
    let archivosSeleccionados = [];

    const set = files => {
      archivosSeleccionados = [...files];
      dropInformes.classList.add("tiene-archivo");
      nombreInformes.textContent = files.length === 1
        ? "✅ " + files[0].name
        : `✅ ${files.length} archivos — ${files.map(f=>f.name).join(", ").substring(0,60)}${files.length>2?"...":""}`;
      nombreInformes.classList.remove("hidden");
      document.getElementById("btnSubirInformes").disabled = false;
    };

    dropInformes.addEventListener("click", () => inputInformes.click());
    dropInformes.addEventListener("dragover",  e => { e.preventDefault(); dropInformes.classList.add("drag-over"); });
    dropInformes.addEventListener("dragleave", () => dropInformes.classList.remove("drag-over"));
    dropInformes.addEventListener("drop", e => { e.preventDefault(); dropInformes.classList.remove("drag-over"); set([...e.dataTransfer.files]); });
    inputInformes.addEventListener("change", () => set([...inputInformes.files]));

    document.getElementById("btnSubirInformes")?.addEventListener("click", async () => {
      const sec  = this._getSec();
      const anio = document.getElementById("uploadAnio")?.value;
      const trim = document.getElementById("uploadTrimestre")?.value;
      if (!sec)                       { APP.toast("❌ Selecciona la secretaría", "error"); return; }
      if (!archivosSeleccionados.length) { APP.toast("❌ Selecciona al menos un PDF", "error"); return; }

      CARGA_MASIVA.limpiar();
      archivosSeleccionados.forEach(f =>
        CARGA_MASIVA.encolar([f], CARGA_MASIVA.TIPOS.INFORME_PDF, { secretaria:sec, anio, trimestre:trim })
      );
      await CARGA_MASIVA.iniciar(() => {
        this._cargarResumen();
        this._cargarHistorial();
        APP.cargarDatos();
      });
    });
  },

  // ── CARGA HISTÓRICA MASIVA ──────────────────────────────────
  _initCargaMasiva() {
    const panel = document.getElementById("tab-historico");
    if (!panel || panel.dataset.inicializado) return;
    panel.dataset.inicializado = "1";

    // Escuchar botón de inicio
    document.getElementById("btnIniciarHistorico")?.addEventListener("click", () => this._iniciarHistorico());

    // Dropzone masiva
    const dropH = document.getElementById("dropHistorico");
    const inpH  = document.getElementById("inputHistorico");
    if (!dropH || !inpH) return;
    inpH.multiple = true;

    dropH.addEventListener("click", () => inpH.click());
    dropH.addEventListener("dragover",  e => { e.preventDefault(); dropH.classList.add("drag-over"); });
    dropH.addEventListener("dragleave", () => dropH.classList.remove("drag-over"));
    dropH.addEventListener("drop", e => {
      e.preventDefault(); dropH.classList.remove("drag-over");
      this._setArchivosHistorico([...e.dataTransfer.files]);
    });
    inpH.addEventListener("change", () => this._setArchivosHistorico([...inpH.files]));
  },

  _archivosHistorico: [],

  _setArchivosHistorico(files) {
    this._archivosHistorico = files;
    const lista = document.getElementById("listaHistorico");
    const btn   = document.getElementById("btnIniciarHistorico");
    if (!lista) return;

    if (!files.length) {
      lista.innerHTML = "";
      if (btn) btn.disabled = true;
      return;
    }

    // Agrupar por nombre para mostrar organizado
    lista.innerHTML = `
      <div style="margin-bottom:10px;font-size:12px;font-weight:500;color:var(--marino)">
        ${files.length} archivo(s) seleccionado(s):
      </div>
      <div style="max-height:200px;overflow-y:auto;border:.5px solid var(--borde);border-radius:8px">
        ${[...files].map((f,i) => {
          const sizeKB = (f.size/1024).toFixed(0);
          const esGrande = f.size > 5*1024*1024;
          return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;
                       border-bottom:.5px solid var(--borde);font-size:11px;
                       background:${esGrande?"var(--amarillo-50)":""}">
            <span>${f.name.toLowerCase().endsWith('.pdf') ? '📄' : '📊'}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.name}</span>
            <span style="color:${esGrande?"#8a7000":"var(--texto-3)"};flex-shrink:0">${sizeKB}KB${esGrande?" ⚠️":""}</span>
          </div>`;
        }).join("")}
      </div>
      ${[...files].some(f=>f.size>5*1024*1024) ? `
        <div style="margin-top:8px;font-size:11px;color:#8a7000;background:var(--amarillo-50);
             border:.5px solid var(--amarillo);border-radius:6px;padding:7px 10px">
          ⚠️ Algunos archivos son grandes (+5MB). Se procesarán normalmente pero pueden tardar más.
        </div>` : ""}`;

    if (btn) btn.disabled = false;
  },

  async _iniciarHistorico() {
    const sec   = this._getSec();
    const anio  = document.getElementById("hAnio")?.value;
    const trim  = document.getElementById("hTrimestre")?.value;
    const tipo  = document.getElementById("hTipo")?.value;
    const files = this._archivosHistorico;

    if (!sec)        { APP.toast("❌ Selecciona la secretaría", "error"); return; }
    if (!files.length){ APP.toast("❌ Selecciona al menos un archivo", "error"); return; }

    // Mapear tipo de formulario a tipo de CARGA_MASIVA
    const tipoMasiva = {
      "informe_pdf": CARGA_MASIVA.TIPOS.INFORME_PDF,
      "soporte_pdf": CARGA_MASIVA.TIPOS.SOPORTE_PDF,
      "plan_pd":     CARGA_MASIVA.TIPOS.PLAN_PD,
      "plan_pa":     CARGA_MASIVA.TIPOS.PLAN_PA,
    }[tipo] || CARGA_MASIVA.TIPOS.INFORME_PDF;

    CARGA_MASIVA.limpiar();
    files.forEach(f =>
      CARGA_MASIVA.encolar([f], tipoMasiva, { secretaria:sec, anio, trimestre:trim })
    );
    await CARGA_MASIVA.iniciar(() => {
      this._cargarResumen();
      this._cargarHistorial();
      APP.cargarDatos();
    });
  },

  // ── Eliminar período ────────────────────────────────────────
  _confirmarEliminar() {
    const sec  = this._getSec();
    const anio = document.getElementById("uploadAnio")?.value;
    const trim = document.getElementById("uploadTrimestre")?.value;
    if (!sec) { APP.toast("❌ Selecciona la secretaría primero", "error"); return; }
    if (!confirm(`¿Eliminar todos los datos de:\n\n${this._nomSec(sec)} · Q${trim} ${anio}\n\nEsta acción no se puede deshacer.`)) return;
    API.post({ action:"eliminar_periodo", secretaria:sec, anio, trimestre:trim }).then(r => {
      if (r.ok) { APP.toast("🗑️ Período eliminado"); APP.cargarDatos(); this._cargarResumen(); }
      else APP.toast("❌ " + r.error, "error");
    });
  },

  // ── Agregar beneficiario manual ────────────────────────────
  _modalBenef() {
    document.body.insertAdjacentHTML("beforeend", `
      <div id="mOv" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;
           display:flex;align-items:center;justify-content:center;padding:1rem">
        <div style="background:#fff;border-radius:12px;padding:1.5rem;width:100%;max-width:400px;
             max-height:90vh;overflow-y:auto">
          <h3 style="margin-bottom:1rem;font-size:14px;color:var(--marino)">+ Agregar beneficiario</h3>
          <div class="form-group"><label>Nombre completo</label><input id="mN" type="text" placeholder="Juan Pérez"></div>
          <div class="form-group"><label>Vereda</label><input id="mV" type="text" placeholder="El Rosario"></div>
          <div class="form-group"><label>Tipo de beneficio</label><input id="mB" type="text" placeholder="Insumos agroecológicos"></div>
          <div class="form-group"><label>Coordenadas (opcional)</label><input id="mC" type="text" placeholder="6.2312, -75.1687"></div>
          <div class="form-group"><label>Código de programa</label><input id="mP" type="text" placeholder="050404"></div>
          <div class="form-group"><label>Detalle adicional</label><input id="mD" type="text" placeholder="Descripción"></div>
          <div style="display:flex;gap:8px;margin-top:1rem">
            <button class="btn-primary" style="flex:1" onclick="ADMIN._saveBenef()">Guardar</button>
            <button class="btn-secondary" onclick="document.getElementById('mOv').remove()">Cancelar</button>
          </div>
        </div>
      </div>`);
  },

  async _saveBenef() {
    const sec  = this._getSec();
    const anio = document.getElementById("uploadAnio")?.value;
    const trim = document.getElementById("uploadTrimestre")?.value;
    const r = await API.agregarBeneficiario({
      nombre:          document.getElementById("mN").value,
      vereda:          document.getElementById("mV").value,
      tipo_beneficio:  document.getElementById("mB").value,
      coordenadas_raw: document.getElementById("mC").value,
      programa_codigo: document.getElementById("mP").value,
      detalle:         document.getElementById("mD").value,
      secretaria: sec, anio, trimestre: trim
    });
    document.getElementById("mOv")?.remove();
    if (r.ok) { APP.toast("✅ Beneficiario agregado"); APP.cargarDatos(); }
    else APP.toast("❌ " + r.error, "error");
  },

  // ── Helpers ────────────────────────────────────────────────
  _termLog(termId, msg) {
    const el = document.getElementById(termId);
    if (!el) return;
    el.classList.remove("hidden");
    el.innerHTML += `<span style="color:#8B949E">[${new Date().toLocaleTimeString()}] ${msg}</span>\n`;
    el.scrollTop = el.scrollHeight;
  }
};

// Inicializar carga de informes cuando carga el DOM
document.addEventListener("DOMContentLoaded", () => {
  // Se llama desde admin._panel() después de login
  const orig = ADMIN._panel.bind(ADMIN);
  ADMIN._panel = function() { orig(); this._initInforme(); };
});
