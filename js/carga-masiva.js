// ══════════════════════════════════════════════════════════════
// CARGA MASIVA · v1.0
// Motor de procesamiento por lotes con cola secuencial,
// barra de progreso, registro de errores y resumen final.
// Aplica tanto a carga individual como histórica masiva.
// ══════════════════════════════════════════════════════════════

const CARGA_MASIVA = {

  // ── Estado interno ────────────────────────────────────────────
  _cola:      [],   // [{archivo, meta, tipo}]
  _activa:    false,
  _resultados:[],   // [{archivo, ok, mensaje, duracion}]
  _pendientesConf: [], // [{id, nombre, vereda_original, programa_codigo}]
  _totalArchivos: 0,
  _procesados:    0,
  _onFinalizado:  null,

  // ── Tipos de carga ────────────────────────────────────────────
  TIPOS: {
    INFORME_PDF: "informe_pdf",
    SOPORTE_PDF: "soporte_pdf",
    PLAN_PD:     "plan_pd",
    PLAN_PA:     "plan_pa",
  },

  // ── Encolar archivos ─────────────────────────────────────────
  // meta = { secretaria, anio, trimestre }
  encolar(archivos, tipo, meta) {
    for (const archivo of archivos) {
      this._cola.push({ archivo, tipo, meta: { ...meta } });
    }
  },

  // ── Iniciar procesamiento ────────────────────────────────────
  async iniciar(onFinalizado) {
    if (this._activa) {
      APP.toast("⚠️ Ya hay una carga en curso, espera que termine", "error");
      return;
    }
    if (!this._cola.length) {
      APP.toast("⚠️ No hay archivos en la cola", "error");
      return;
    }

    this._activa         = true;
    this._resultados     = [];
    this._pendientesConf = [];
    this._procesados     = 0;
    this._totalArchivos  = this._cola.length;
    this._onFinalizado  = onFinalizado || null;

    this._mostrarPanel();
    this._log(`🚀 Iniciando carga de ${this._totalArchivos} archivo(s)...`, "info");
    this._actualizarProgreso(0);

    while (this._cola.length > 0) {
      const item = this._cola.shift();
      await this._procesarItem(item);
    }

    this._activa = false;
    this._mostrarResumenFinal();
    if (this._onFinalizado) this._onFinalizado(this._resultados);
  },

  // ── Procesar un item de la cola ───────────────────────────────
  async _procesarItem(item) {
    this._procesados++;
    const { archivo, tipo, meta } = item;
    const nombre = archivo.name || archivo.nombre || "archivo";
    const inicio = Date.now();

    this._actualizarProgreso(this._procesados - 1);
    this._actualizarEstadoActual(
      `Procesando archivo ${this._procesados} de ${this._totalArchivos}`,
      nombre, tipo, meta
    );
    this._log(
      `[${this._procesados}/${this._totalArchivos}] 📄 ${nombre} — ` +
      `${meta.secretaria ? this._nomSec(meta.secretaria) : ""} ` +
      `${meta.anio ? "· " + meta.anio : ""} ` +
      `${meta.trimestre ? "Q" + meta.trimestre : ""}`,
      "procesando"
    );

    try {
      // Validación previa de tamaño (sin límite restrictivo — solo aviso)
      const sizeKB = (archivo.size || 0) / 1024;
      if (sizeKB > 20480) { // > 20 MB: avisar pero no bloquear
        this._log(`   ⚠️ Archivo grande (${(sizeKB/1024).toFixed(1)} MB) — puede tardar más`, "warn");
      }

      // Convertir a base64
      this._log(`   📦 Leyendo archivo (${(sizeKB).toFixed(0)} KB)...`, "info");
      const base64 = await API.fileToBase64(archivo);

      // Llamar al endpoint correcto según tipo
      let resultado;
      switch (tipo) {
        case this.TIPOS.INFORME_PDF:
          resultado = await API.subirInformes({
            secretaria: meta.secretaria,
            anio:       meta.anio,
            trimestre:  meta.trimestre,
            pdfs:       [{ base64, nombre }]
          });
          break;

        case this.TIPOS.SOPORTE_PDF:
          resultado = await API.subirSoportes({
            secretaria: meta.secretaria,
            anio:       meta.anio,
            trimestre:  meta.trimestre,
            soportes:   [{ base64, nombre }]
          });
          break;

        case this.TIPOS.PLAN_PD:
          resultado = await API.cargarPlanDesarrollo({
            secretaria:  meta.secretaria,
            base64Excel: base64
          });
          break;

        case this.TIPOS.PLAN_PA:
          resultado = await API.cargarPlanAccion({
            secretaria:  meta.secretaria,
            anio:        meta.anio,
            base64Excel: base64
          });
          break;

        default:
          resultado = { ok: false, error: "Tipo de archivo desconocido: " + tipo };
      }

      const duracion = ((Date.now() - inicio) / 1000).toFixed(1);

      if (resultado.ok) {
        const detalle = this._resumenResultado(resultado, tipo);
        this._log(`   ✅ Completado en ${duracion}s${detalle ? " — " + detalle : ""}`, "ok");
        this._resultados.push({ nombre, ok: true, mensaje: detalle || "OK", duracion });
        // Mostrar logs del servidor si los hay
        if (resultado.log) {
          resultado.log
            .filter(l => l.estado !== "procesando")
            .forEach(l => this._log(`      ${l.estado==="ok"?"✓":l.estado==="warn"?"⚠":"→"} ${l.msg}`, l.estado==="ok"?"ok":l.estado==="warn"?"warn":"info"));
        }
        // Recopilar beneficiarios con vereda pendiente de confirmación
        if (resultado.pendientes_confirmacion?.length) {
          resultado.pendientes_confirmacion.forEach(p => {
            if (!this._pendientesConf.find(x => x.id === p.id)) this._pendientesConf.push(p);
          });
          this._log(`   ⚠️ ${resultado.pendientes_confirmacion.length} beneficiario(s) con vereda desconocida — requieren asignación manual`, "warn");
        }
      } else {
        const error = resultado.error || "Error desconocido";
        this._log(`   ❌ Falló en ${duracion}s — ${error}`, "error");
        this._resultados.push({ nombre, ok: false, mensaje: error, duracion });
      }

    } catch (err) {
      const duracion = ((Date.now() - inicio) / 1000).toFixed(1);
      const msg = err.toString();
      this._log(`   ❌ Error inesperado en ${duracion}s — ${msg}`, "error");
      this._resultados.push({ nombre, ok: false, mensaje: msg, duracion });
    }

    this._actualizarProgreso(this._procesados);

    // Pequeña pausa entre archivos para no saturar la API
    if (this._cola.length > 0) {
      await new Promise(r => setTimeout(r, 1200));
    }
  },

  // ── Resumen de resultado por tipo ─────────────────────────────
  _resumenResultado(r, tipo) {
    switch (tipo) {
      case this.TIPOS.INFORME_PDF:
        return [
          r.programas     ? `${r.programas} programas`       : "",
          r.beneficiarios ? `${r.beneficiarios} beneficiarios`: "",
          r.contratos     ? `${r.contratos} contratos`        : "",
        ].filter(Boolean).join(" · ");
      case this.TIPOS.PLAN_PD:
        return r.indicadores ? `${r.indicadores} indicadores PD` : "";
      case this.TIPOS.PLAN_PA:
        return r.programas ? `${r.programas} programas PA` : "";
      case this.TIPOS.SOPORTE_PDF:
        return r.contratos ? `${r.contratos} contratos` : "";
      default: return "";
    }
  },

  // ── Resumen final ─────────────────────────────────────────────
  _mostrarResumenFinal() {
    const ok     = this._resultados.filter(r => r.ok);
    const fallos = this._resultados.filter(r => !r.ok);
    const total  = this._resultados.length;

    this._log("", "info");
    this._log("═══════════════════════════════════════", "info");
    this._log(`RESUMEN FINAL — ${total} archivo(s) procesado(s)`, "titulo");
    this._log(`✅ Exitosos:  ${ok.length}`, ok.length > 0 ? "ok" : "info");
    this._log(`❌ Con error: ${fallos.length}`, fallos.length > 0 ? "error" : "info");
    this._log("═══════════════════════════════════════", "info");

    if (fallos.length > 0) {
      this._log("Archivos con error:", "warn");
      fallos.forEach(f => this._log(`  ✗ ${f.nombre} — ${f.mensaje}`, "error"));
    }

    // Mostrar panel de resumen visual
    const resumenEl = document.getElementById("cmResumen");
    if (!resumenEl) return;

    resumenEl.style.display = "block";
    resumenEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div style="background:var(--verde-50);border:.5px solid var(--verde);border-radius:8px;padding:12px;text-align:center">
          <div style="font-family:var(--font-d);font-size:2rem;font-weight:600;color:var(--verde);line-height:1">${ok.length}</div>
          <div style="font-size:11px;color:var(--verde);margin-top:2px">Archivos cargados correctamente</div>
        </div>
        <div style="background:${fallos.length>0?"var(--rojo-50)":"var(--verde-50)"};border:.5px solid ${fallos.length>0?"var(--rojo)":"var(--verde)"};border-radius:8px;padding:12px;text-align:center">
          <div style="font-family:var(--font-d);font-size:2rem;font-weight:600;color:${fallos.length>0?"var(--rojo)":"var(--verde)"};line-height:1">${fallos.length}</div>
          <div style="font-size:11px;color:${fallos.length>0?"var(--rojo)":"var(--verde)"};margin-top:2px">${fallos.length>0?"Con errores — ver detalles arriba":"Sin errores ✓"}</div>
        </div>
      </div>

      ${fallos.length > 0 ? `
        <div style="background:var(--rojo-50);border:.5px solid var(--rojo);border-radius:8px;padding:10px 12px;margin-bottom:12px">
          <div style="font-size:12px;font-weight:500;color:var(--rojo);margin-bottom:6px">❌ Archivos que fallaron:</div>
          ${fallos.map(f=>`
            <div style="font-size:11px;color:var(--rojo);padding:3px 0;border-bottom:.5px solid rgba(163,45,45,.15)">
              <strong>${f.nombre}</strong><br>
              <span style="color:var(--texto-2)">${f.mensaje}</span>
            </div>`).join("")}
        </div>` : ""}

      <div style="display:flex;gap:8px">
        ${ok.length > 0 ? `
        <button class="btn-primary" onclick="APP.cargarDatos();CARGA_MASIVA.cerrarPanel()" style="flex:2;font-size:12px">
          🔄 Ver resultados en el observatorio
        </button>` : ""}
        <button class="btn-secondary" onclick="CARGA_MASIVA.cerrarPanel()" style="flex:1;font-size:12px">
          Cerrar
        </button>
        ${fallos.length > 0 ? `
        <button class="btn-secondary" onclick="CARGA_MASIVA._reintentarFallos()" style="flex:1;font-size:12px">
          🔁 Reintentar fallidos
        </button>` : ""}
      </div>`;

    if (ok.length > 0) APP.toast(`✅ ${ok.length} archivo(s) cargados correctamente`);
    if (fallos.length > 0) APP.toast(`⚠️ ${fallos.length} archivo(s) con error`, "error");

    // Panel de veredas pendientes de confirmación
    if (this._pendientesConf.length) {
      this._mostrarPanelConfirmacion();
    }
  },

  // ── Panel de asignación de veredas pendientes ─────────────────
  _mostrarPanelConfirmacion() {
    const pendientes = this._pendientesConf;
    if (!pendientes.length) return;
    const veredasOficiales = [
      "La Sonadora","La Peña","La Piedra","Quebrada Arriba",
      "Los Naranjos","El Roble","El Tronco / El Rosario","Urbano"
    ];
    const opts = veredasOficiales.map(v => `<option value="${v}">${v}</option>`).join("");

    const filas = pendientes.map((p, i) => `
      <div id="pendConf_${i}" style="background:#f8f9fa;border:.5px solid #dee2e6;border-radius:8px;padding:10px 12px;margin-bottom:8px">
        <div style="font-size:12px;font-weight:500;color:#1a2a35;margin-bottom:2px">${p.nombre || "(sin nombre)"}</div>
        <div style="font-size:11px;color:#6c757d;margin-bottom:8px">
          Vereda en el documento: <strong style="color:#c0392b">"${p.vereda_original}"</strong>
          ${p.programa_codigo ? `· Programa: ${p.programa_codigo}` : ""}
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <select id="selVereda_${i}" style="flex:1;padding:6px 8px;border:.5px solid #ced4da;border-radius:6px;font-size:12px;background:#fff">
            <option value="">— Seleccionar vereda oficial —</option>
            ${opts}
          </select>
          <button onclick="CARGA_MASIVA._guardarConfirmacion(${i},'${p.id}')"
            style="padding:6px 14px;background:var(--marino);color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;white-space:nowrap">
            Guardar
          </button>
        </div>
        <div id="confMsg_${i}" style="font-size:11px;margin-top:4px;display:none"></div>
      </div>`).join("");

    const contenedor = document.createElement("div");
    contenedor.id = "cmPanelConfirmacion";
    contenedor.style.cssText = "padding:1rem 1.25rem;border-top:.5px solid var(--borde)";
    contenedor.innerHTML = `
      <div style="font-size:13px;font-weight:500;color:#c0392b;margin-bottom:10px">
        ⚠️ ${pendientes.length} beneficiario(s) con vereda desconocida
      </div>
      <div style="font-size:11.5px;color:var(--texto-2);margin-bottom:12px">
        Los siguientes registros mencionan ubicaciones que no corresponden a ninguna
        vereda oficial de Guatapé. Asigna cada uno a su vereda real para que aparezca
        correctamente en el mapa y en los reportes.
      </div>
      <div id="listaPendientes">${filas}</div>
      <div id="cmConfResumen" style="display:none;margin-top:10px;padding:8px 12px;background:var(--verde-50);border:.5px solid var(--verde);border-radius:8px;font-size:12px;color:var(--verde)"></div>`;

    const panel = document.querySelector("#cmPanel > div");
    if (panel) panel.appendChild(contenedor);
  },

  async _guardarConfirmacion(idx, id) {
    const sel = document.getElementById(`selVereda_${idx}`);
    const msg = document.getElementById(`confMsg_${idx}`);
    if (!sel?.value) {
      if (msg) { msg.textContent = "Selecciona una vereda primero."; msg.style.display="block"; msg.style.color="#c0392b"; }
      return;
    }
    const vereda = sel.value;
    const btn = sel.nextElementSibling;
    btn.disabled = true; btn.textContent = "Guardando...";

    const r = await API.post({ action: "confirmar_veredas", confirmaciones: [{ id, vereda }] });

    if (r.ok) {
      const fila = document.getElementById(`pendConf_${idx}`);
      if (fila) {
        fila.style.opacity = "0.5";
        fila.style.pointerEvents = "none";
        fila.insertAdjacentHTML("beforeend", `<div style="font-size:11px;color:var(--verde);margin-top:4px">✅ Guardado como "${vereda}"</div>`);
      }
      this._pendientesConf = this._pendientesConf.filter(p => p.id !== id);
      if (!this._pendientesConf.length) {
        const res = document.getElementById("cmConfResumen");
        if (res) { res.textContent = "✅ Todas las veredas han sido asignadas correctamente."; res.style.display="block"; }
        APP.cargarDatos();
      }
    } else {
      if (msg) { msg.textContent = "Error: " + (r.error||"desconocido"); msg.style.display="block"; msg.style.color="#c0392b"; }
      btn.disabled = false; btn.textContent = "Guardar";
    }
  },

  // ── Reintentar fallos ─────────────────────────────────────────
  _reintentarFallos() {
    // Re-encolar los que fallaron (ya no tenemos los archivos originales,
    // así que solo informamos al usuario)
    const resumenEl = document.getElementById("cmResumen");
    if (resumenEl) {
      resumenEl.innerHTML = `
        <div style="background:var(--amarillo-50);border:.5px solid var(--amarillo);border-radius:8px;padding:10px 12px;font-size:12px;color:#8a7000">
          ⚠️ Para reintentar los archivos fallidos, selecciónalosnuevamente en el formulario de carga.
        </div>`;
    }
  },

  // ── Panel de progreso ─────────────────────────────────────────
  _mostrarPanel() {
    document.getElementById("cmPanel")?.remove();

    document.body.insertAdjacentHTML("beforeend", `
      <div id="cmPanel" style="
        position:fixed;inset:0;background:rgba(23,39,45,.7);z-index:9500;
        display:flex;align-items:center;justify-content:center;padding:1rem;
        backdrop-filter:blur(3px)">
        <div style="
          background:#fff;border-radius:14px;width:100%;max-width:600px;
          max-height:90vh;overflow:hidden;display:flex;flex-direction:column;
          box-shadow:0 16px 48px rgba(0,0,0,.3)">

          <!-- Header -->
          <div style="background:var(--marino);padding:1rem 1.25rem;display:flex;align-items:center;gap:12px;flex-shrink:0">
            <div style="width:36px;height:36px;background:var(--azul);border-radius:8px;
                 display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📦</div>
            <div style="flex:1">
              <div style="font-size:13.5px;font-weight:500;color:#fff">Carga masiva de información</div>
              <div id="cmSubtitulo" style="font-size:10.5px;color:rgba(137,196,226,.65)">Iniciando...</div>
            </div>
            <div id="cmContador" style="font-size:11px;color:rgba(255,255,255,.5);flex-shrink:0">
              0 / ${this._totalArchivos}
            </div>
          </div>

          <!-- Progreso -->
          <div style="padding:12px 1.25rem;border-bottom:.5px solid var(--borde);flex-shrink:0">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--texto-2);margin-bottom:6px">
              <span id="cmEstadoActual">Preparando...</span>
              <span id="cmPct">0%</span>
            </div>
            <div style="height:8px;background:var(--azul-50);border-radius:8px;overflow:hidden">
              <div id="cmBarra" style="height:100%;width:0%;background:linear-gradient(90deg,var(--azul),var(--verde));border-radius:8px;transition:width .5s ease"></div>
            </div>
            <div id="cmArchivoActual" style="font-size:10.5px;color:var(--texto-3);margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
          </div>

          <!-- Terminal de logs -->
          <div id="cmTerminal" style="
            flex:1;overflow-y:auto;padding:10px 14px;
            background:#0D1117;font-family:'Courier New',monospace;
            font-size:11px;color:#8B949E;line-height:1.8;
            min-height:160px;max-height:300px"></div>

          <!-- Resumen final (oculto hasta terminar) -->
          <div id="cmResumen" style="display:none;padding:1rem 1.25rem;border-top:.5px solid var(--borde);flex-shrink:0;overflow-y:auto;max-height:260px"></div>

        </div>
      </div>`);
  },

  cerrarPanel() {
    document.getElementById("cmPanel")?.remove();
    this._cola = [];
    this._resultados = [];
    this._procesados = 0;
    this._totalArchivos = 0;
  },

  // ── Actualizar UI ─────────────────────────────────────────────
  _actualizarProgreso(procesados) {
    const pct = this._totalArchivos > 0
      ? Math.round((procesados / this._totalArchivos) * 100) : 0;

    const barra    = document.getElementById("cmBarra");
    const pctEl    = document.getElementById("cmPct");
    const contador = document.getElementById("cmContador");
    const subtitulo= document.getElementById("cmSubtitulo");

    if (barra)    barra.style.width = pct + "%";
    if (pctEl)    pctEl.textContent  = pct + "%";
    if (contador) contador.textContent = `${procesados} / ${this._totalArchivos}`;
    if (subtitulo) subtitulo.textContent = procesados < this._totalArchivos
      ? `Procesando ${procesados + 1} de ${this._totalArchivos}...`
      : `¡Completado! ${this._resultados.filter(r=>r.ok).length} exitosos`;
  },

  _actualizarEstadoActual(estado, nombre, tipo, meta) {
    const el     = document.getElementById("cmEstadoActual");
    const nomEl  = document.getElementById("cmArchivoActual");
    const tipoLbl = {
      informe_pdf: "📄 Informe PDF",
      soporte_pdf: "📋 Soporte PDF",
      plan_pd:     "📊 Plan Desarrollo",
      plan_pa:     "📊 Plan Acción",
    }[tipo] || "📄 Archivo";
    if (el)    el.textContent   = estado;
    if (nomEl) nomEl.textContent = `${tipoLbl} · ${nombre}`;
  },

  _log(msg, tipo = "info") {
    const el = document.getElementById("cmTerminal");
    if (!el) return;
    const cols = {
      ok:         "#3FB950",
      error:      "#F85149",
      warn:       "#D29922",
      procesando: "#58A6FF",
      info:       "#8B949E",
      titulo:     "#A5D6FF",
    };
    const ts  = new Date().toLocaleTimeString("es-CO");
    const col = cols[tipo] || cols.info;
    el.innerHTML += `<span style="color:${col}">[${ts}] ${msg}</span>\n`;
    el.scrollTop  = el.scrollHeight;
  },

  // ── Helpers ───────────────────────────────────────────────────
  _nomSec(id) {
    const m = {
      medio_ambiente:"Medio Ambiente", gobierno:"Gobierno",
      bienestar:"Bienestar",           turismo:"Turismo",
      planeacion:"Planeación",         hacienda:"Hacienda"
    };
    return m[id] || id;
  },

  // ── Limpiar cola sin procesar ─────────────────────────────────
  limpiar() {
    this._cola = [];
    this._resultados = [];
    this._procesados = 0;
    this._totalArchivos = 0;
  }
};
