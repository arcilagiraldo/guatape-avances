// ══════════════════════════════════════════════════════════════
// SETUP — Asistente de instalación · v2.2
// Se activa automáticamente la primera vez que se abre la app
// sin URL configurada. No requiere editar ningún archivo.
// ══════════════════════════════════════════════════════════════

const SETUP = {

  _paso: 1,

  // Se llama desde app.js al iniciar
  verificarYMostrar() {
    const urlGuardada = localStorage.getItem("gt_api_url");
    const yaConfigurado = urlGuardada && urlGuardada.startsWith("https://script.google.com");
    const esTouchDevice  = window.innerWidth < 768;

    if (!yaConfigurado && !APP_CONFIG.API_URL.startsWith("https://script.google.com")) {
      // Primera vez: mostrar asistente tras 800ms para que cargue el mapa demo
      setTimeout(() => this.mostrar(), 800);
    }
  },

  mostrar() {
    this._paso = 1;
    this._renderModal();
  },

  _renderModal() {
    document.getElementById("setupModal")?.remove();

    const pasos = {
      1: this._paso1(),
      2: this._paso2(),
      3: this._paso3(),
      4: this._paso4(),
    };

    const html = `
<div id="setupModal" style="
  position:fixed;inset:0;background:rgba(22,48,64,.85);z-index:10000;
  display:flex;align-items:center;justify-content:center;padding:1rem;
  backdrop-filter:blur(4px);">
  <div style="
    background:#fff;border-radius:16px;width:100%;max-width:520px;
    max-height:92vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.35);">

    <!-- Header -->
    <div style="background:var(--nav-bg,#163040);padding:1.25rem 1.5rem;border-radius:16px 16px 0 0;
         display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;background:var(--dorado,#D5B854);border-radius:10px;
           display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🏛️</div>
      <div>
        <div style="font-size:14px;font-weight:600;color:#fff;">Asistente de instalación</div>
        <div style="font-size:11px;color:rgba(255,255,255,.55);">Juntos Construimos Guatapé · Paso ${this._paso} de 4</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:6px;">
        ${[1,2,3,4].map(n => `<div style="width:8px;height:8px;border-radius:50%;
          background:${n <= this._paso ? 'var(--dorado,#D5B854)' : 'rgba(255,255,255,.2)'};"></div>`).join('')}
      </div>
    </div>

    <!-- Contenido -->
    <div style="padding:1.5rem;">
      ${pasos[this._paso] || ""}
    </div>

  </div>
</div>`;

    document.body.insertAdjacentHTML("beforeend", html);
  },

  // ── PASO 1: Bienvenida y qué necesitas ────────────────────────
  _paso1() {
    return `
      <h3 style="font-size:1.1rem;font-weight:600;color:var(--verde-oscuro,#027034);margin-bottom:.75rem;">
        👋 Bienvenido al Observatorio Municipal
      </h3>
      <p style="font-size:13px;color:#4A4A48;line-height:1.7;margin-bottom:1rem;">
        Esta app ya está funcionando en <strong>modo local</strong> con datos reales de Guatapé Q1 2026.
        Para conectarla con tu municipio y activar la carga de informes necesitas:
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:1.5rem;">
        ${[
          ["1️⃣","Cuenta Google","La cuenta del municipio (ya la tienes)"],
          ["2️⃣","Gemini API Key","Gratis en aistudio.google.com · 2 min"],
          ["3️⃣","Apps Script","Un solo copy-paste · 5 min"],
          ["4️⃣","URL del backend","La pegas aquí · 1 min"],
        ].map(([ico,tit,desc]) => `
          <div style="display:flex;gap:10px;align-items:flex-start;background:#F5F5F3;
               border-radius:8px;padding:10px 12px;">
            <span style="font-size:18px;flex-shrink:0;">${ico}</span>
            <div>
              <div style="font-size:12px;font-weight:600;color:#1A1A18;">${tit}</div>
              <div style="font-size:11px;color:#6A6A68;">${desc}</div>
            </div>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="SETUP._cerrar()" style="
          flex:1;background:#F5F5F3;border:.5px solid #ddd;border-radius:8px;
          padding:10px;font-size:13px;cursor:pointer;color:#4A4A48;">
          Ahora no
        </button>
        <button onclick="SETUP._irPaso(2)" style="
          flex:2;background:var(--verde-oscuro,#027034);color:#fff;border:none;
          border-radius:8px;padding:10px;font-size:13px;font-weight:500;cursor:pointer;">
          Empezar instalación →
        </button>
      </div>`;
  },

  // ── PASO 2: Obtener Gemini API Key ────────────────────────────
  _paso2() {
    return `
      <h3 style="font-size:1.1rem;font-weight:600;color:var(--verde-oscuro,#027034);margin-bottom:.75rem;">
        🤖 Gemini API Key (gratis, 2 min)
      </h3>
      <p style="font-size:13px;color:#4A4A48;line-height:1.7;margin-bottom:1rem;">
        Gemini es la IA de Google que extrae automáticamente los datos de tus PDFs e informes.
        La clave es <strong>completamente gratuita</strong>.
      </p>
      <div style="background:#E8F5EE;border:.5px solid #027034;border-radius:8px;
           padding:12px 14px;margin-bottom:1.25rem;">
        <div style="font-size:12px;font-weight:600;color:#027034;margin-bottom:8px;">Pasos:</div>
        <ol style="font-size:12px;color:#027034;line-height:2;margin:0;padding-left:1.2rem;">
          <li>Abre <a href="https://aistudio.google.com" target="_blank" rel="noopener"
              style="color:#027034;font-weight:600;">aistudio.google.com</a></li>
          <li>Inicia sesión con la cuenta Google del municipio</li>
          <li>Clic en <strong>"Get API Key"</strong> → <strong>"Create API key"</strong></li>
          <li>Copia la clave (empieza con <code style="background:#fff;padding:1px 5px;border-radius:3px;">AIza...</code>)</li>
          <li>Guárdala — la necesitas en el siguiente paso</li>
        </ol>
      </div>
      <div style="background:#FAEEDA;border:.5px solid #D5B854;border-radius:8px;
           padding:10px 12px;font-size:11.5px;color:#7A5800;margin-bottom:1.5rem;">
        💡 <strong>¿Ya tienes la clave?</strong> Sigue al paso 3. Si no, abre el link en otra pestaña
        y vuelve cuando la tengas.
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="SETUP._irPaso(1)" style="
          flex:1;background:#F5F5F3;border:.5px solid #ddd;border-radius:8px;
          padding:10px;font-size:13px;cursor:pointer;color:#4A4A48;">
          ← Atrás
        </button>
        <button onclick="SETUP._irPaso(3)" style="
          flex:2;background:var(--verde-oscuro,#027034);color:#fff;border:none;
          border-radius:8px;padding:10px;font-size:13px;font-weight:500;cursor:pointer;">
          Ya tengo mi API Key →
        </button>
      </div>`;
  },

  // ── PASO 3: Configurar Apps Script ────────────────────────────
  _paso3() {
    return `
      <h3 style="font-size:1.1rem;font-weight:600;color:var(--verde-oscuro,#027034);margin-bottom:.75rem;">
        ⚙️ Configurar el backend (5 min)
      </h3>
      <p style="font-size:13px;color:#4A4A48;line-height:1.7;margin-bottom:1rem;">
        El backend procesa los PDFs con IA y guarda todo en Google Sheets.
        Son 4 pasos rápidos en Apps Script:
      </p>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:1.25rem;font-size:12px;">
        ${[
          ["1","Abre","<a href='https://script.google.com' target='_blank' rel='noopener' style='color:var(--verde-oscuro,#027034);font-weight:600;'>script.google.com</a> con la cuenta del municipio"],
          ["2","Nuevo proyecto","Nómbralo <strong>Guatapé App</strong>"],
          ["3","Pega el código","Borra todo lo que hay → Copia el archivo <code>GUATAPE_BACKEND_COMPLETO.gs</code> → Pégalo"],
          ["4","Pon tu API Key","En la línea 14 reemplaza <code>PEGA_AQUI_TU_GEMINI_API_KEY</code> con tu clave"],
          ["5","Ejecuta instalar","Menú desplegable → selecciona <strong>instalar</strong> → clic ▶ Ejecutar"],
          ["6","Acepta permisos","Primera vez pedirá permisos → acepta todo → espera el mensaje ✅"],
          ["7","Publica","Implementar → Nueva implementación → Tipo: Aplicación web → Acceso: Cualquier usuario → Implementar"],
          ["8","Copia la URL","Algo como <code>https://script.google.com/macros/s/XXXXX/exec</code>"],
        ].map(([n,tit,desc]) => `
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="width:22px;height:22px;background:var(--verde-oscuro,#027034);color:#fff;
                 border-radius:50%;font-size:11px;font-weight:700;display:flex;align-items:center;
                 justify-content:center;flex-shrink:0;margin-top:1px;">${n}</div>
            <div style="line-height:1.6;"><strong>${tit}:</strong> ${desc}</div>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="SETUP._irPaso(2)" style="
          flex:1;background:#F5F5F3;border:.5px solid #ddd;border-radius:8px;
          padding:10px;font-size:13px;cursor:pointer;color:#4A4A48;">
          ← Atrás
        </button>
        <button onclick="SETUP._irPaso(4)" style="
          flex:2;background:var(--verde-oscuro,#027034);color:#fff;border:none;
          border-radius:8px;padding:10px;font-size:13px;font-weight:500;cursor:pointer;">
          Ya tengo la URL →
        </button>
      </div>`;
  },

  // ── PASO 4: Pegar URL y verificar ────────────────────────────
  _paso4() {
    const urlActual = localStorage.getItem("gt_api_url") || "";
    return `
      <h3 style="font-size:1.1rem;font-weight:600;color:var(--verde-oscuro,#027034);margin-bottom:.75rem;">
        🔗 Conectar la app al servidor
      </h3>
      <p style="font-size:13px;color:#4A4A48;line-height:1.7;margin-bottom:1rem;">
        Pega la URL de Apps Script. La app la guarda automáticamente — no necesitas editar ningún archivo.
      </p>
      <div style="margin-bottom:1rem;">
        <label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;
               color:#6A6A68;display:block;margin-bottom:5px;">URL del backend (Apps Script)</label>
        <input id="inputApiUrl" type="url" value="${urlActual}"
          placeholder="https://script.google.com/macros/s/XXXXX/exec"
          style="width:100%;font-size:12px;border:.5px solid #ddd;border-radius:8px;
                 padding:10px 12px;font-family:monospace;box-sizing:border-box;
                 background:#F5F5F3;color:#1A1A18;">
      </div>
      <div style="display:flex;gap:8px;margin-bottom:1rem;">
        <button onclick="SETUP._verificarURL()" style="
          flex:1;background:var(--azul-marino,#163040);color:#fff;border:none;
          border-radius:8px;padding:9px;font-size:12px;font-weight:500;cursor:pointer;">
          🔌 Verificar conexión
        </button>
      </div>
      <div id="setupVerifLog" style="
        background:#0D1117;border-radius:8px;padding:10px 12px;min-height:60px;
        font-family:monospace;font-size:11px;color:#8B949E;display:none;
        margin-bottom:1rem;max-height:140px;overflow-y:auto;"></div>
      <div style="display:flex;gap:8px;">
        <button onclick="SETUP._irPaso(3)" style="
          flex:1;background:#F5F5F3;border:.5px solid #ddd;border-radius:8px;
          padding:10px;font-size:13px;cursor:pointer;color:#4A4A48;">
          ← Atrás
        </button>
        <button onclick="SETUP._guardarYFinalizar()" id="btnFinalizarSetup" style="
          flex:2;background:#ccc;color:#fff;border:none;
          border-radius:8px;padding:10px;font-size:13px;font-weight:500;cursor:not-allowed;"
          disabled>
          Guardar y finalizar ✓
        </button>
      </div>`;
  },

  // ── Lógica ────────────────────────────────────────────────────
  _irPaso(n) {
    this._paso = n;
    this._renderModal();
  },

  _cerrar() {
    document.getElementById("setupModal")?.remove();
  },

  async _verificarURL() {
    const url = document.getElementById("inputApiUrl")?.value?.trim();
    const log = document.getElementById("setupVerifLog");
    if (!log) return;

    log.style.display = "block";
    log.innerHTML = "";

    const L = (msg, color = "#8B949E") =>
      log.innerHTML += `<span style="color:${color};">${msg}</span><br>`;

    if (!url || !url.startsWith("https://script.google.com")) {
      L("❌ La URL debe empezar con https://script.google.com", "#F85149");
      return;
    }

    L("🔌 Conectando con el servidor...", "#58A6FF");
    log.scrollTop = log.scrollHeight;

    try {
      const t0 = Date.now();
      const r  = await fetch(url + "?action=verificar");
      const d  = await r.json();
      const ms = Date.now() - t0;

      if (d.ok) {
        L(`✅ Servidor respondió en ${ms}ms`, "#3FB950");
        L(`   Instalado: ${d.instalado ? "Sí ✓" : "No — ejecuta instalar()"}`,
          d.instalado ? "#3FB950" : "#D29922");
        L(`   Sheets: ${d.tiene_sheets ? "Conectado ✓" : "Sin configurar"}`,
          d.tiene_sheets ? "#3FB950" : "#D29922");
        L(`   Drive: ${d.tiene_drive ? "Conectado ✓" : "Sin configurar"}`,
          d.tiene_drive ? "#3FB950" : "#D29922");
        L(`   Gemini: ${d.tiene_gemini ? "API Key configurada ✓" : "⚠️ Falta configurar"}`,
          d.tiene_gemini ? "#3FB950" : "#D29922");

        if (!d.instalado) {
          L("", "#8B949E");
          L("⚠️ Ejecuta instalar() en Apps Script primero", "#D29922");
          L("   Menú → instalar → ▶ Ejecutar", "#D29922");
        } else {
          // Habilitar el botón de finalizar
          const btn = document.getElementById("btnFinalizarSetup");
          if (btn) {
            btn.disabled = false;
            btn.style.background = "var(--verde-oscuro,#027034)";
            btn.style.cursor = "pointer";
          }
          L("", "#8B949E");
          L("🎉 ¡Todo listo! Haz clic en 'Guardar y finalizar'", "#3FB950");
        }
      } else {
        L("❌ El servidor devolvió: " + d.error, "#F85149");
        L("   Verifica que la URL sea correcta", "#8B949E");
      }
    } catch (err) {
      L("❌ No se pudo conectar: " + err.message, "#F85149");
      L("   Verifica que Apps Script esté publicado como", "#8B949E");
      L("   'Aplicación web' con acceso 'Cualquier usuario'", "#8B949E");
    }

    log.scrollTop = log.scrollHeight;
  },

  _guardarYFinalizar() {
    const url = document.getElementById("inputApiUrl")?.value?.trim();
    if (!url) return;

    // Guardar en localStorage — config.js lo lee al cargar
    localStorage.setItem("gt_api_url", url);
    APP_CONFIG.API_URL = url;

    // Quitar banner demo
    document.getElementById("bannerLocal")?.remove();
    // Quitar offsets del banner
    document.querySelectorAll(".navbar,.filtros-bar,.seccion").forEach(el =>
      el.style.removeProperty("top")
    );
    document.documentElement.style.removeProperty("--demo-offset");

    this._cerrar();

    // Recargar datos desde el servidor real
    APP.toast("✅ Conectado. Cargando datos del servidor...");
    APP.cargarDatos();

    // Mostrar confirmación breve
    setTimeout(() => {
      APP.toast("🎉 ¡App configurada correctamente!");
    }, 3000);
  },

  // ── Instrucciones GitHub ──────────────────────────────────────
  mostrarGuiaGitHub() {
    document.getElementById("setupModal")?.remove();
    const html = `
<div id="setupModal" style="position:fixed;inset:0;background:rgba(22,48,64,.85);z-index:10000;
  display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px);">
  <div style="background:#fff;border-radius:16px;width:100%;max-width:500px;max-height:92vh;
       overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.35);">
    <div style="background:var(--nav-bg,#163040);padding:1.25rem 1.5rem;border-radius:16px 16px 0 0;">
      <div style="font-size:14px;font-weight:600;color:#fff;">📡 Publicar en GitHub Pages</div>
      <div style="font-size:11px;color:rgba(255,255,255,.55);">La app que ven los ciudadanos</div>
    </div>
    <div style="padding:1.5rem;">
      <p style="font-size:13px;color:#4A4A48;line-height:1.7;margin-bottom:1.25rem;">
        GitHub Pages es gratuito y te da una URL pública del tipo
        <strong>tuusuario.github.io/guatape</strong>.
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:1.5rem;font-size:12px;">
        ${[
          ["1","Ve a","<a href='https://github.com/new' target='_blank' rel='noopener' style='color:var(--verde-oscuro,#027034);font-weight:600;'>github.com/new</a> y crea un repo llamado <strong>guatape</strong> (público)"],
          ["2","Sube archivos","En el repo → <strong>Add file → Upload files</strong> → sube TODOS los archivos de la carpeta <code>frontend/</code>"],
          ["3","Activa Pages","Settings → Pages → Branch: <strong>main</strong> → Save"],
          ["4","Espera 2 min","Tu app estará en <strong>tuusuario.github.io/guatape</strong>"],
          ["5","Configura","Abre esa URL → aparece el asistente de instalación → sigue los pasos"],
        ].map(([n,tit,desc]) => `
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="width:22px;height:22px;background:var(--verde-oscuro,#027034);color:#fff;
                 border-radius:50%;font-size:11px;font-weight:700;display:flex;align-items:center;
                 justify-content:center;flex-shrink:0;margin-top:1px;">${n}</div>
            <div style="line-height:1.6;"><strong>${tit}:</strong> ${desc}</div>
          </div>`).join('')}
      </div>
      <div style="background:#E8F5EE;border-radius:8px;padding:10px 12px;
           font-size:12px;color:#027034;margin-bottom:1.5rem;">
        💡 <strong>Tip:</strong> Los archivos a subir son los que están dentro de la carpeta
        <code>frontend/</code> del ZIP: index.html, carpeta css/ y carpeta js/.
        No subas el backend (.gs) ni el ZIP completo.
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="SETUP._cerrar()" style="
          flex:1;background:#F5F5F3;border:.5px solid #ddd;border-radius:8px;
          padding:10px;font-size:13px;cursor:pointer;color:#4A4A48;">Cerrar</button>
        <button onclick="SETUP.mostrar()" style="
          flex:2;background:var(--verde-oscuro,#027034);color:#fff;border:none;
          border-radius:8px;padding:10px;font-size:13px;font-weight:500;cursor:pointer;">
          → Configurar backend</button>
      </div>
    </div>
  </div>
</div>`;
    document.body.insertAdjacentHTML("beforeend", html);
  },

  // Llamado desde diagnóstico: abre el asistente en paso 4
  abrirDesdeAdmin() {
    this._paso = 4;
    this._renderModal();
  },

  // Permite cambiar la URL desde diagnóstico sin el asistente completo
  cambiarURL() {
    this.abrirDesdeAdmin();
  }
};
