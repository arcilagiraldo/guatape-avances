// ══════════════════════════════════════════════════════════════
// ROL · Pantalla de selección de rol al inicio
// ══════════════════════════════════════════════════════════════

const ROL = {

  _roles: [
    { id:"visitante",        icono:"👁️",  label:"Visitante",         sub:"Solo consulta",                  usuario:null },
    { id:"superadmin",       icono:"🏛️",  label:"Administrador",     sub:"Acceso total",                   usuario:"admin_guatape" },
    { id:"medio_ambiente",   icono:"🌿",  label:"Medio Ambiente",    sub:"Sec. Medio Ambiente y Des. Rural",usuario:"admin_medioambiente" },
    { id:"gobierno",         icono:"⚖️",  label:"Gobierno",          sub:"Secretaría de Gobierno",         usuario:"admin_gobierno" },
    { id:"bienestar",        icono:"🤝",  label:"Bienestar Social",  sub:"Sec. Bienestar y Des. Social",   usuario:"admin_bienestar" },
    { id:"turismo",          icono:"🏔️",  label:"Turismo",           sub:"Secretaría de Turismo",          usuario:"admin_turismo" },
    { id:"planeacion",       icono:"📐",  label:"Planeación",        sub:"Secretaría de Planeación",       usuario:"admin_planeacion" },
    { id:"hacienda",         icono:"💰",  label:"Hacienda",          sub:"Secretaría de Hacienda",         usuario:"admin_hacienda" },
    { id:"documentador",     icono:"📋",  label:"Documentador",      sub:"Carga masiva todas las sec.",    usuario:"documentador1" },
  ],

  init() {
    // Si ya hay sesión activa, no mostrar modal
    if (API.estaLogueado()) return;
    this._render();
  },

  _render() {
    const modal = document.getElementById("rolModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    const grid = document.getElementById("rolGrid");
    grid.innerHTML = this._roles.map(r => `
      <button class="rol-card" data-rol="${r.id}" data-usuario="${r.usuario || ''}">
        <span class="rol-ico">${r.icono}</span>
        <span class="rol-label">${r.label}</span>
        <span class="rol-sub">${r.sub}</span>
      </button>
    `).join("");

    grid.querySelectorAll(".rol-card").forEach(btn => {
      btn.addEventListener("click", () => this._seleccionar(btn.dataset.rol, btn.dataset.usuario));
    });
  },

  _seleccionar(rolId, usuario) {
    if (rolId === "visitante") {
      this._cerrar();
      return;
    }
    // Mostrar formulario de login dentro del modal
    document.getElementById("rolGrid").classList.add("hidden");
    document.getElementById("rolBack").classList.remove("hidden");
    const form = document.getElementById("rolLoginForm");
    form.classList.remove("hidden");
    document.getElementById("rolLoginUsuario").value = usuario || "";
    document.getElementById("rolLoginPassword").value = "";
    document.getElementById("rolLoginError").classList.add("hidden");
    document.getElementById("rolLoginPassword").focus();
    document.getElementById("rolLoginTitle").textContent =
      this._roles.find(r => r.id === rolId)?.label || "Acceso";
  },

  _volver() {
    document.getElementById("rolGrid").classList.remove("hidden");
    document.getElementById("rolLoginForm").classList.add("hidden");
    document.getElementById("rolBack").classList.add("hidden");
  },

  async _doLogin() {
    const u   = document.getElementById("rolLoginUsuario").value.trim();
    const p   = document.getElementById("rolLoginPassword").value;
    const err = document.getElementById("rolLoginError");
    const btn = document.getElementById("rolBtnLogin");
    if (!u || !p) { err.textContent = "Completa usuario y contraseña."; err.classList.remove("hidden"); return; }
    btn.textContent = "Ingresando..."; btn.disabled = true;
    const r = await API.login(u, p);
    btn.textContent = "Ingresar"; btn.disabled = false;
    if (r.ok) {
      this._cerrar();
      // Navegar al panel admin
      document.querySelectorAll(".nav-btn[data-section='admin']").forEach(b => b.click());
      APP.toast("✅ Bienvenido, " + r.nombre);
    } else {
      err.textContent = r.error || "Usuario o contraseña incorrectos.";
      err.classList.remove("hidden");
    }
  },

  _cerrar() {
    const modal = document.getElementById("rolModal");
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  },

  _eventos() {
    document.getElementById("rolBtnLogin")?.addEventListener("click", () => this._doLogin());
    document.getElementById("rolLoginPassword")?.addEventListener("keydown", e => {
      if (e.key === "Enter") this._doLogin();
    });
    document.getElementById("rolBack")?.addEventListener("click", () => this._volver());
    document.getElementById("rolBtnVisitante")?.addEventListener("click", () => this._cerrar());
  }
};
