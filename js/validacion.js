// ══════════════════════════════════════════════════════════════
// VALIDACIÓN · v1.0
// Panel de validación, detección y corrección de errores
// Accesible desde el panel admin → pestaña 🔍 Validación
// ══════════════════════════════════════════════════════════════

const VALIDACION = {

  _errores:    [],
  _advertencias: [],
  _datos:      null,

  // ── Renderizar panel ─────────────────────────────────────────
  renderPanel() {
    const el = document.getElementById("tab-validacion");
    if (!el) return;

    el.innerHTML = `
      <div style="padding:1rem 0 2rem">

        <div style="background:var(--azul-50);border:.5px solid var(--azul);border-radius:var(--radio);
             padding:12px 14px;margin-bottom:1.25rem;font-size:12px;color:var(--azul-dark);line-height:1.7">
          <strong>🔍 Panel de validación de datos</strong><br>
          Detecta y corrige problemas en los datos cargados: duplicados, coordenadas inválidas,
          valores faltantes, contratos sin programa, etc.
        </div>

        <!-- Botones de acción -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:1.25rem">
          <button class="btn-primary" onclick="VALIDACION.ejecutarValidacion()" style="font-size:12px">
            🔍 Ejecutar validación completa
          </button>
          <button class="btn-secondary" onclick="VALIDACION.deduplicar()" style="font-size:12px">
            🧹 Eliminar duplicados
          </button>
          <button class="btn-secondary" onclick="VALIDACION.exportarReporte()" style="font-size:12px">
            📋 Exportar reporte
          </button>
          <button class="btn-secondary" onclick="VALIDACION.verificarConexion()" style="font-size:12px">
            🔌 Verificar integridad BD
          </button>
        </div>

        <!-- Resumen de estado -->
        <div id="val-resumen" style="display:none;margin-bottom:1.25rem"></div>

        <!-- Lista de errores -->
        <div id="val-errores" style="display:none"></div>

        <!-- Lista de advertencias -->
        <div id="val-advertencias" style="display:none"></div>

        <!-- Log de operaciones -->
        <div id="val-log" style="display:none;background:#0D1117;border-radius:var(--radio);
             padding:12px;font-family:monospace;font-size:11px;color:#8B949E;
             max-height:200px;overflow-y:auto;margin-top:1rem"></div>

      </div>`;
  },

  // ── Validación completa ───────────────────────────────────────
  async ejecutarValidacion() {
    this._errores      = [];
    this._advertencias = [];
    this._log("🔍 Iniciando validación completa...", "info");

    // Obtener datos actuales
    const datos = await API.getDatos({ anio:"todos", trimestre:"todos", secretaria:"todas" });
    if (!datos.ok) {
      this._log("❌ No se pudo obtener los datos: " + datos.error, "error");
      return;
    }
    this._datos = datos;

    const ps  = datos.programas     || [];
    const bs  = datos.beneficiarios || [];
    const cs  = datos.contratos     || [];
    const mPD = datos.metasPD       || [];

    this._log(`📊 Analizando ${ps.length} programas, ${bs.length} beneficiarios, ${cs.length} contratos...`, "info");

    // ── 1. Duplicados ─────────────────────────────────────────
    this._validarDuplicados(ps, bs, cs);

    // ── 2. Coordenadas inválidas ──────────────────────────────
    this._validarCoordenadas(bs);

    // ── 3. Valores faltantes críticos ─────────────────────────
    this._validarCamposCriticos(ps, bs, cs);

    // ── 4. Contratos sin programa ─────────────────────────────
    this._validarContratosHuerfanos(cs, ps);

    // ── 5. Porcentajes fuera de rango ─────────────────────────
    this._validarPorcentajes(ps, mPD);

    // ── 6. Valores monetarios anómalos ───────────────────────
    this._validarValoresMonetarios(cs);

    // ── 7. Secretarías sin datos ──────────────────────────────
    this._validarSecretariasSinDatos(ps);

    this._mostrarResultados();
  },

  _validarDuplicados(ps, bs, cs) {
    // Programas duplicados (misma sec+codigo+anio+trim)
    const claves = new Set();
    ps.forEach(p => {
      const k = `${p.secretaria}|${p.codigo}|${p.anio}|${p.trimestre}`;
      if (claves.has(k)) {
        this._errores.push({
          tipo: "duplicado", icono: "🔴",
          titulo: `Programa duplicado: ${p.codigo}`,
          detalle: `${p.nombre} — ${this._nomSec(p.secretaria)} Q${p.trimestre} ${p.anio}`,
          accion: "limpiar_duplicados",
          data: { tabla: "programas", secretaria: p.secretaria, anio: p.anio, trimestre: p.trimestre }
        });
      } else claves.add(k);
    });

    // Beneficiarios duplicados (nombre+vereda+programa+anio+trim)
    const clavesB = new Set();
    bs.forEach(b => {
      const k = `${b.nombre}|${b.vereda}|${b.programa_codigo}|${b.anio}|${b.trimestre}`;
      if (clavesB.has(k)) {
        this._advertencias.push({
          tipo: "duplicado_benef", icono: "🟡",
          titulo: `Beneficiario posiblemente duplicado`,
          detalle: `${b.nombre} — ${b.vereda} — ${b.tipo_beneficio}`,
          accion: null
        });
      } else clavesB.add(k);
    });

    // Contratos duplicados (mismo número+secretaria)
    const clavesC = new Set();
    cs.forEach(c => {
      if (!c.numero) return;
      const k = `${c.numero}|${c.secretaria}`;
      if (clavesC.has(k)) {
        this._errores.push({
          tipo: "contrato_dup", icono: "🔴",
          titulo: `Contrato duplicado: ${c.numero}`,
          detalle: `${this._nomSec(c.secretaria)} — ${(c.objeto||"").substring(0,60)} — ${this._peso(c.valor)}`,
          accion: "limpiar_duplicados",
          data: { tabla: "contratos" }
        });
      } else clavesC.add(k);
    });

    if (this._errores.filter(e=>e.tipo==="duplicado"||e.tipo==="contrato_dup").length === 0) {
      this._log("✅ Sin duplicados detectados", "ok");
    }
  },

  _validarCoordenadas(bs) {
    let invalidas = 0;
    bs.forEach(b => {
      const lat = parseFloat(b.lat), lng = parseFloat(b.lng);
      // Colombia está entre lat 12.5 / -4.2 y lng -67 / -79
      const fueraRango = lat && lng && (lat < -5 || lat > 13 || lng < -80 || lng > -66);
      const enCero     = (!lat || !lng || (lat === 0 && lng === 0));
      if (fueraRango) {
        invalidas++;
        this._errores.push({
          tipo: "coord_invalida", icono: "🔴",
          titulo: `Coordenadas fuera de Colombia`,
          detalle: `${b.nombre} — ${b.vereda} — lat:${lat} lng:${lng}`,
          accion: "abrir_editor_mapa",
          data: { id: b.id, nombre: b.nombre }
        });
      } else if (enCero && b.es_aproximado !== "SI") {
        invalidas++;
        this._advertencias.push({
          tipo: "coord_cero", icono: "🟡",
          titulo: `Sin coordenadas: ${b.nombre}`,
          detalle: `${b.vereda} — se usará ubicación aproximada de la vereda`,
          accion: "abrir_editor_mapa",
          data: { id: b.id }
        });
      }
    });
    if (invalidas === 0) this._log("✅ Todas las coordenadas son válidas", "ok");
    else this._log(`⚠️ ${invalidas} coordenadas requieren revisión`, "warn");
  },

  _validarCamposCriticos(ps, bs, cs) {
    // Programas sin nombre
    ps.filter(p => !p.nombre || p.nombre.trim() === "").forEach(p => {
      this._errores.push({
        tipo: "campo_vacio", icono: "🔴",
        titulo: `Programa sin nombre: ${p.codigo}`,
        detalle: `${this._nomSec(p.secretaria)} Q${p.trimestre} ${p.anio}`,
        accion: null, data: {}
      });
    });

    // Contratos sin valor
    cs.filter(c => !parseFloat(c.valor) || parseFloat(c.valor) === 0).forEach(c => {
      this._advertencias.push({
        tipo: "valor_cero", icono: "🟡",
        titulo: `Contrato sin valor: ${c.numero || "sin número"}`,
        detalle: `${(c.objeto||"").substring(0,60)} — ${this._nomSec(c.secretaria)}`,
        accion: null, data: {}
      });
    });

    // Beneficiarios sin vereda
    bs.filter(b => !b.vereda || b.vereda.trim() === "").forEach(b => {
      this._advertencias.push({
        tipo: "campo_vacio", icono: "🟡",
        titulo: `Beneficiario sin vereda: ${b.nombre}`,
        detalle: `Programa ${b.programa_codigo}`,
        accion: null, data: {}
      });
    });

    this._log(`✅ Campos críticos revisados`, "ok");
  },

  _validarContratosHuerfanos(cs, ps) {
    const codigosProg = new Set(ps.map(p => p.codigo));
    const huerfanos   = cs.filter(c => c.programa_codigo && !codigosProg.has(c.programa_codigo));
    huerfanos.forEach(c => {
      this._advertencias.push({
        tipo: "contrato_huerfano", icono: "🟡",
        titulo: `Contrato sin programa asociado: ${c.numero}`,
        detalle: `Código ${c.programa_codigo} no encontrado — ${(c.objeto||"").substring(0,55)}`,
        accion: null, data: {}
      });
    });
    if (huerfanos.length === 0) this._log("✅ Todos los contratos tienen programa asociado", "ok");
  },

  _validarPorcentajes(ps, mPD) {
    const anomalos = [...ps, ...mPD].filter(p => {
      const ppa = parseFloat(p.pct_pa || p.pct_pd || 0);
      return ppa < 0 || ppa > 150; // >100% puede ser válido (superar meta), >150 probablemente error
    });
    anomalos.forEach(p => {
      this._advertencias.push({
        tipo: "pct_anomalo", icono: "🟡",
        titulo: `Porcentaje anómalo: ${parseFloat(p.pct_pa||p.pct_pd||0).toFixed(1)}%`,
        detalle: `${p.nombre || p.indicador} — ${this._nomSec(p.secretaria)}`,
        accion: null, data: {}
      });
    });
    if (anomalos.length === 0) this._log("✅ Porcentajes dentro de rangos válidos", "ok");
  },

  _validarValoresMonetarios(cs) {
    const MAX_RAZONABLE = 50_000_000_000; // $50B — límite para detectar errores de formato
    cs.filter(c => parseFloat(c.valor) > MAX_RAZONABLE).forEach(c => {
      this._errores.push({
        tipo: "valor_anomalo", icono: "🔴",
        titulo: `Valor de contrato posiblemente erróneo`,
        detalle: `${c.numero} — ${this._peso(c.valor)} — revisa si tiene puntos/comas extras`,
        accion: null, data: {}
      });
    });
  },

  _validarSecretariasSinDatos(ps) {
    const secs = ["gobierno","bienestar","turismo","planeacion","medio_ambiente","hacienda"];
    const conDatos = new Set(ps.map(p => p.secretaria));
    secs.filter(s => !conDatos.has(s)).forEach(s => {
      this._advertencias.push({
        tipo: "sec_sin_datos", icono: "🟡",
        titulo: `${this._nomSec(s)} — sin informes de ejecución`,
        detalle: "El plan de acción está precargado. Falta cargar informes trimestrales.",
        accion: null, data: {}
      });
    });
  },

  // ── Mostrar resultados ────────────────────────────────────────
  _mostrarResultados() {
    const resEl   = document.getElementById("val-resumen");
    const errEl   = document.getElementById("val-errores");
    const advEl   = document.getElementById("val-advertencias");
    if (!resEl) return;

    const nErr = this._errores.length;
    const nAdv = this._advertencias.length;

    // Resumen
    resEl.style.display = "block";
    resEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div style="background:${nErr>0?"var(--rojo-50)":"var(--verde-50)"};border:.5px solid ${nErr>0?"var(--rojo)":"var(--verde)"};
             border-radius:8px;padding:12px;text-align:center">
          <div style="font-family:var(--font-d);font-size:1.8rem;font-weight:600;
               color:${nErr>0?"var(--rojo)":"var(--verde)"};line-height:1">${nErr}</div>
          <div style="font-size:11px;margin-top:2px;color:${nErr>0?"var(--rojo)":"var(--verde)"}">
            ${nErr>0?"❌ Errores críticos":"✅ Sin errores críticos"}
          </div>
        </div>
        <div style="background:${nAdv>0?"var(--amarillo-50)":"var(--verde-50)"};border:.5px solid ${nAdv>0?"var(--amarillo)":"var(--verde)"};
             border-radius:8px;padding:12px;text-align:center">
          <div style="font-family:var(--font-d);font-size:1.8rem;font-weight:600;
               color:${nAdv>0?"#c8a800":"var(--verde)"};line-height:1">${nAdv}</div>
          <div style="font-size:11px;margin-top:2px;color:${nAdv>0?"#c8a800":"var(--verde)"}">
            ${nAdv>0?"⚠️ Advertencias":"✅ Sin advertencias"}
          </div>
        </div>
        <div style="background:var(--azul-50);border:.5px solid var(--azul);
             border-radius:8px;padding:12px;text-align:center">
          <div style="font-family:var(--font-d);font-size:1.8rem;font-weight:600;color:var(--azul-dark);line-height:1">
            ${(this._datos?.programas?.length||0)+(this._datos?.beneficiarios?.length||0)+(this._datos?.contratos?.length||0)}
          </div>
          <div style="font-size:11px;margin-top:2px;color:var(--azul-dark)">registros revisados</div>
        </div>
      </div>
      ${nErr===0&&nAdv===0?`
        <div style="margin-top:10px;background:var(--verde-50);border:.5px solid var(--verde);
             border-radius:8px;padding:10px 12px;font-size:12px;color:var(--verde);text-align:center">
          🎉 ¡Los datos están en perfecto estado! No se encontraron problemas.
        </div>`:""}`;

    // Errores
    if (nErr > 0) {
      errEl.style.display = "block";
      errEl.innerHTML = `
        <div style="font-size:12.5px;font-weight:500;color:var(--rojo);margin-bottom:8px;margin-top:12px">
          ❌ Errores que requieren corrección (${nErr})
        </div>
        <div style="border:.5px solid var(--rojo);border-radius:8px;overflow:hidden">
          ${this._errores.map((e,i) => this._htmlItem(e, i, "error")).join("")}
        </div>`;
    }

    // Advertencias
    if (nAdv > 0) {
      advEl.style.display = "block";
      advEl.innerHTML = `
        <div style="font-size:12.5px;font-weight:500;color:#c8a800;margin-bottom:8px;margin-top:12px">
          ⚠️ Advertencias (${nAdv})
        </div>
        <div style="border:.5px solid var(--amarillo);border-radius:8px;overflow:hidden">
          ${this._advertencias.map((a,i) => this._htmlItem(a, i, "warn")).join("")}
        </div>`;
    }

    this._log(`\n📋 Validación completada — ${nErr} errores, ${nAdv} advertencias`, nErr>0?"error":"ok");
  },

  _htmlItem(item, idx, tipo) {
    const bg    = tipo==="error" ? "rgba(163,45,45,.04)"  : "rgba(251,220,8,.04)";
    const bord  = tipo==="error" ? "rgba(163,45,45,.12)"  : "rgba(251,220,8,.2)";
    let boton   = "";

    if (item.accion === "limpiar_duplicados") {
      boton = `<button onclick="VALIDACION._limpiarDuplicados()" style="
        font-size:10px;background:var(--rojo);color:#fff;border:none;
        border-radius:5px;padding:3px 9px;cursor:pointer;white-space:nowrap">
        🧹 Limpiar ahora
      </button>`;
    } else if (item.accion === "abrir_editor_mapa") {
      boton = `<button onclick="APP._ir('admin')" style="
        font-size:10px;background:var(--azul-dark);color:#fff;border:none;
        border-radius:5px;padding:3px 9px;cursor:pointer;white-space:nowrap">
        📍 Abrir editor mapa
      </button>`;
    }

    return `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:9px 12px;
           border-bottom:.5px solid ${bord};background:${bg}">
        <span style="font-size:15px;flex-shrink:0">${item.icono}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:500;color:var(--texto)">${item.titulo}</div>
          <div style="font-size:11px;color:var(--texto-2);margin-top:1px;line-height:1.5">${item.detalle}</div>
        </div>
        ${boton ? `<div style="flex-shrink:0">${boton}</div>` : ""}
      </div>`;
  },

  // ── Acciones de corrección ────────────────────────────────────
  async deduplicar() {
    this._log("🧹 Ejecutando deduplicación en el servidor...", "info");
    const logEl = document.getElementById("val-log");
    if (logEl) logEl.style.display = "block";

    const r = await API.post({ action: "deduplicar" });
    if (r.ok) {
      const d = r.detalle || {};
      this._log(`✅ Deduplicación completada — ${r.eliminadas} filas duplicadas eliminadas`, "ok");
      if (r.eliminadas > 0) {
        Object.entries(d).forEach(([tabla, n]) => {
          if (n > 0) this._log(`   ${tabla}: ${n} duplicados eliminados`, "ok");
        });
        APP.toast(`✅ ${r.eliminadas} duplicados eliminados`);
        API.getDatos({ anio:"todos", trimestre:"todos", secretaria:"todas" });
      } else {
        this._log("   No se encontraron duplicados", "info");
        APP.toast("✅ Sin duplicados — datos limpios");
      }
    } else {
      this._log("❌ Error: " + (r.error || "Sin respuesta"), "error");
      APP.toast("❌ Error al deduplicar", "error");
    }
  },

  async _limpiarDuplicados() {
    if (!confirm("¿Eliminar automáticamente todos los registros duplicados?\n\nEsta acción no se puede deshacer.")) return;
    await this.deduplicar();
    setTimeout(() => this.ejecutarValidacion(), 1500);
  },

  async verificarConexion() {
    this._log("🔌 Verificando integridad de la base de datos...", "info");
    const logEl = document.getElementById("val-log");
    if (logEl) logEl.style.display = "block";

    if (API._esModoLocal()) {
      this._log("⚠️ Sin conexión al servidor — usando datos locales", "warn");
      this._log("   Conecta el servidor para verificar la BD remota", "info");
      return;
    }

    const r = await API.get({ action: "verificar" });
    if (r.ok) {
      this._log(`✅ Servidor conectado (v${r.version||"?"})`, "ok");
      this._log(`   Sheets: ${r.tiene_sheets?"✓":"✗ Sin configurar"}`, r.tiene_sheets?"ok":"error");
      this._log(`   Drive:  ${r.tiene_drive?"✓":"✗ Sin configurar"}`,  r.tiene_drive?"ok":"error");
      this._log(`   Gemini: ${r.tiene_gemini?"✓":"⚠️ Falta API Key"}`,  r.tiene_gemini?"ok":"warn");
    } else {
      this._log("❌ " + r.error, "error");
    }
  },

  exportarReporte() {
    if (!this._datos && !this._errores.length) {
      APP.toast("⚠️ Ejecuta la validación primero", "error"); return;
    }
    const lineas = [
      "REPORTE DE VALIDACIÓN — Observatorio Municipal Guatapé",
      "Fecha: " + new Date().toLocaleString("es-CO"),
      "═══════════════════════════════════════",
      "",
      `RESUMEN: ${this._errores.length} errores · ${this._advertencias.length} advertencias`,
      "",
    ];
    if (this._errores.length) {
      lineas.push("ERRORES CRÍTICOS:");
      this._errores.forEach(e => lineas.push(`  ✗ ${e.titulo}\n    ${e.detalle}`));
      lineas.push("");
    }
    if (this._advertencias.length) {
      lineas.push("ADVERTENCIAS:");
      this._advertencias.forEach(a => lineas.push(`  ⚠ ${a.titulo}\n    ${a.detalle}`));
    }
    const blob = new Blob([lineas.join("\n")], { type: "text/plain;charset=utf-8" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `validacion_guatape_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    APP.toast("📋 Reporte exportado");
  },

  // ── Helpers ───────────────────────────────────────────────────
  _log(msg, tipo = "info") {
    const el = document.getElementById("val-log");
    if (!el) return;
    el.style.display = "block";
    const cols = { ok:"#3FB950", error:"#F85149", warn:"#D29922", info:"#8B949E" };
    el.innerHTML += `<span style="color:${cols[tipo]||cols.info}">${msg}</span>\n`;
    el.scrollTop = el.scrollHeight;
  },
  _nomSec(id) {
    const m={medio_ambiente:"Medio Ambiente",gobierno:"Gobierno",
             bienestar:"Bienestar",turismo:"Turismo",planeacion:"Planeación",hacienda:"Hacienda"};
    return m[id]||id;
  },
  _peso(v) {
    const n=parseFloat(v)||0;
    if(n>=1e9) return "$"+(n/1e9).toFixed(1)+"B";
    if(n>=1e6) return "$"+(n/1e6).toFixed(0)+"M";
    return "$"+n.toLocaleString("es-CO");
  }
};
