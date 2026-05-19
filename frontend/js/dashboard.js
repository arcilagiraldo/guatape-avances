// ══════════════════════════════════════════════════════════════
// DASHBOARD EJECUTIVO · v2.3
// Pantalla principal — información completa para el alcalde
// ══════════════════════════════════════════════════════════════
const DASHBOARD = {

  render(datos, config) {
    this._datos  = datos;
    this._config = config;
    this._renderGrid();
    this._renderPublica();
    this._actualizarResumenFiltros();
  },

  _renderGrid() {
    const d  = this._datos;
    const m  = d?.metricas || {};
    const ps = d?.programas || [];
    const bs = d?.beneficiarios || [];
    const cs = d?.contratos || [];
    const secs = this._config?.secretarias || [];
    const sM = {};
    secs.forEach(s => sM[s.id] = s);

    const pctGlobal     = parseFloat(m.pct_global_cuatrienio || 0);
    const totalCont     = cs.reduce((s,c) => s + (parseFloat(c.valor)||0), 0);
    const alertas       = this._calcularAlertas(ps, cs);
    const enMeta        = ps.filter(p => parseFloat(p.pct_pa) >= 75).length;
    const rezagados     = ps.filter(p => parseFloat(p.pct_pa) > 0 && parseFloat(p.pct_pa) < 40).length;
    const periodos      = m.periodos_con_datos || [];

    const grid = document.getElementById("dashboardGrid");
    if (!grid) return;

    const hayDatos = ps.length > 0 || bs.length > 0;

    if (!hayDatos) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:4rem 2rem;color:var(--texto-3)">
          <div style="font-size:48px;margin-bottom:1rem;opacity:.4">📊</div>
          <div style="font-size:15px;font-weight:500;color:var(--texto-2);margin-bottom:8px">Aún no hay datos cargados</div>
          <div style="font-size:12px;color:var(--texto-3);max-width:360px;margin:0 auto;line-height:1.7">
            Ve al panel ⚙️ → Admin para cargar el Plan de Desarrollo, el Plan de Acción
            y los informes trimestrales de cada secretaría.
          </div>
        </div>`;
      return;
    }

    grid.innerHTML = `

      <!-- ── KPIs ── -->
      <div class="kpi-card ${pctGlobal >= 75 ? 'ok' : pctGlobal >= 40 ? 'warn' : 'alert'}">
        <span class="kpi-ico">🏁</span>
        <span class="kpi-num">${pctGlobal}%</span>
        <span class="kpi-lbl">Cumplimiento PD</span>
        <span class="kpi-sub">${periodos.length ? periodos.join(" · ") : "Sin períodos"}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-ico">📋</span>
        <span class="kpi-num">${ps.length}</span>
        <span class="kpi-lbl">Programas Plan Acción</span>
        <span class="kpi-sub">${[...new Set(ps.map(p=>p.secretaria))].length} secretarías · 🟢 ${enMeta} en meta</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-ico">👥</span>
        <span class="kpi-num">${bs.length.toLocaleString("es-CO")}</span>
        <span class="kpi-lbl">Beneficiarios</span>
        <span class="kpi-sub">${[...new Set(bs.map(b=>b.vereda))].length} veredas intervenidas</span>
      </div>
      <div class="kpi-card ${alertas.criticas > 0 ? 'alert' : 'ok'}">
        <span class="kpi-ico">${alertas.criticas > 0 ? "⚠️" : "✅"}</span>
        <span class="kpi-num">${alertas.criticas > 0 ? alertas.criticas : cs.length}</span>
        <span class="kpi-lbl">${alertas.criticas > 0 ? "Requieren atención" : "Contratos activos"}</span>
        <span class="kpi-sub">${API.fmtPeso(totalCont)} contratado</span>
      </div>

      <!-- ── Mapa central ── -->
      <div class="dash-mapa-cell" id="dashMapaCell">
        <div style="height:100%;min-height:260px;background:#d4e8d0;border-radius:var(--radio);
             position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center">
          <div style="color:var(--texto-3);font-size:12px;text-align:center">
            <div style="font-size:28px;margin-bottom:6px">🗺️</div>
            <div>Mapa disponible en la sección <strong>Mapa</strong></div>
            <button onclick="APP._ir('mapa')" class="btn-primary"
              style="margin-top:10px;font-size:11.5px;padding:7px 14px">
              Ver mapa completo →
            </button>
          </div>
        </div>
      </div>

      <!-- ── Panel derecho: alertas + programas ── -->
      <div class="dash-info-cell">
        ${this._htmlAlertas(alertas, cs, ps)}
        ${this._htmlProgramas(ps, sM)}
      </div>

      <!-- ── Contratos recientes ── -->
      <div class="dash-contratos-cell">
        ${this._htmlContratos(cs, sM)}
      </div>

      <!-- ── Veredas / beneficiarios ── -->
      <div class="dash-veredas-cell">
        ${this._htmlVeredas(bs, ps)}
      </div>`;
  },

  _calcularAlertas(ps, cs) {
    const rezagados = ps.filter(p => parseFloat(p.pct_pa) > 0 && parseFloat(p.pct_pa) < 40);
    const sinInicio = cs.filter(c => (c.objeto||"").toLowerCase().includes("preoperativ") ||
                                     (c.observaciones||"").toLowerCase().includes("sin inicio"));
    return {
      criticas: rezagados.length + sinInicio.length,
      rezagados,
      sinInicio
    };
  },

  _htmlAlertas(alertas, cs, ps) {
    const items = [];

    // Programas rezagados
    alertas.rezagados.slice(0,2).forEach(p => items.push({
      color: "var(--rojo)", tipo: "rojo",
      titulo: p.nombre?.substring(0,45) + (p.nombre?.length > 45 ? "…" : "") || "Programa",
      desc:   "PA: " + (parseFloat(p.pct_pa)||0).toFixed(0) + "% · PD: " + (parseFloat(p.pct_pd)||0).toFixed(0) + "% — Rezagado"
    }));

    // Contratos sin inicio / preoperativos
    cs.filter(c => (c.objeto||"").toLowerCase().includes("preoperativ") ||
                   (c.numero||"").includes("2025"))
      .slice(0,2).forEach(c => items.push({
        color: "var(--amarillo)", tipo: "warn",
        titulo: c.numero || "Contrato",
        desc:   (c.objeto||"").substring(0,55) + " · " + API.fmtPeso(c.valor)
      }));

    // Programas con 100% (positivo)
    ps.filter(p => parseFloat(p.pct_pa) >= 100).slice(0,2).forEach(p => items.push({
      color: "var(--verde)", tipo: "ok",
      titulo: "✅ " + (p.nombre?.substring(0,42) || "Programa") + " — 100%",
      desc:   p.narrativa?.substring(0,65) + (p.narrativa?.length > 65 ? "…" : "") || ""
    }));

    if (!items.length) return `
      <div class="card" style="flex-shrink:0">
        <div class="card-header"><span class="card-header-title">🔔 Seguimiento</span></div>
        <div style="padding:12px;font-size:12px;color:var(--texto-3);text-align:center">Sin alertas activas</div>
      </div>`;

    return `
      <div class="card" style="flex-shrink:0">
        <div class="card-header">
          <span class="card-header-title">🔔 Seguimiento y alertas</span>
          <span class="card-header-badge">${items.length} items</span>
        </div>
        ${items.map(a => `
          <div class="alerta-row">
            <div class="alerta-dot" style="background:${a.color}"></div>
            <div>
              <div class="alerta-titulo">${a.titulo}</div>
              <div class="alerta-desc">${a.desc}</div>
            </div>
          </div>`).join("")}
      </div>`;
  },

  _htmlProgramas(ps, sM) {
    if (!ps.length) return "";
    const top = [...ps].sort((a,b) => (parseFloat(b.pct_pa)||0) - (parseFloat(a.pct_pa)||0)).slice(0,8);
    return `
      <div class="card" style="flex:1;overflow:hidden;min-height:0">
        <div class="card-header">
          <span class="card-header-title">📊 Programas · % PA y PD</span>
          <span class="card-header-badge">Top ${top.length}</span>
        </div>
        <div style="overflow-y:auto;max-height:240px">
          ${top.map(p => {
            const ppa = parseFloat(p.pct_pa)||0, ppd = parseFloat(p.pct_pd)||0;
            const c   = ppa>=75?"var(--verde)":ppa>=40?"#c8a800":"var(--rojo)";
            const ico = this._config?.iconos?.[p.tipo_icono]?.emoji || "📋";
            return `
              <div class="prog-dash-row">
                <span style="font-size:13px">${ico}</span>
                <div>
                  <div style="font-size:10.5px;font-weight:500;color:var(--texto);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px" title="${p.nombre}">${p.nombre||"—"}</div>
                  <div class="barra-mini"><div class="barra-fill" style="width:${Math.min(ppa,100)}%;background:${c}"></div></div>
                </div>
                <div class="pct-col" style="color:${c}">${ppa.toFixed(0)}%<span>PA</span></div>
                <div class="pct-col" style="color:${c}">${ppd.toFixed(0)}%<span>PD</span></div>
              </div>`;
          }).join("")}
        </div>
      </div>`;
  },

  _htmlContratos(cs, sM) {
    if (!cs.length) return `
      <div class="card">
        <div class="card-header"><span class="card-header-title">💰 Contratos</span></div>
        <div style="padding:12px;font-size:12px;color:var(--texto-3);text-align:center">Sin contratos registrados</div>
      </div>`;

    const top = [...cs].sort((a,b)=>(parseFloat(b.valor)||0)-(parseFloat(a.valor)||0)).slice(0,7);
    const total = cs.reduce((s,c)=>s+(parseFloat(c.valor)||0),0);
    return `
      <div class="card">
        <div class="card-header">
          <span class="card-header-title">💰 Contratos activos</span>
          <span class="card-header-badge">${API.fmtPeso(total)} total</span>
        </div>
        ${top.map(c => {
          const s   = sM[c.secretaria] || {};
          const obj = (c.objeto||"—").substring(0,50) + ((c.objeto||"").length > 50 ? "…" : "");
          const es  = (c.objeto||"").toLowerCase().includes("preoperativ") ? "warn" :
                      (c.fuente==="soporte") ? "ok" : "ok";
          const col = es==="ok"?"var(--verde)":es==="warn"?"#c8a800":"var(--rojo)";
          const bg  = es==="ok"?"var(--verde-50)":es==="warn"?"var(--amarillo-50)":"var(--rojo-50)";
          const lbl = es==="warn"?"⚠️ Atención":"En ejecución";
          return `
            <div class="cont-dash-row">
              <span style="font-family:monospace;font-size:9.5px;font-weight:500;color:var(--azul-dark)">${c.numero||"—"}</span>
              <span style="font-size:10.5px;color:var(--texto-2);line-height:1.4">${obj}</span>
              <span style="font-weight:600;color:var(--marino);font-size:11px">${API.fmtPeso(c.valor)}</span>
              <span class="estado-chip" style="background:${bg};color:${col}">${lbl}</span>
            </div>`;
        }).join("")}
        ${cs.length > 7 ? `<div style="padding:6px 12px;font-size:11px;color:var(--texto-3);cursor:pointer" onclick="APP._ir('contratos')">
          Ver todos los ${cs.length} contratos →</div>` : ""}
      </div>`;
  },

  _htmlVeredas(bs, ps) {
    if (!bs.length) return `
      <div class="card">
        <div class="card-header"><span class="card-header-title">📍 Beneficiarios por vereda</span></div>
        <div style="padding:12px;font-size:12px;color:var(--texto-3);text-align:center">Sin beneficiarios registrados</div>
      </div>`;

    // Contar por vereda
    const cnt = {}, prog = {};
    bs.forEach(b => {
      cnt[b.vereda] = (cnt[b.vereda]||0) + 1;
      if (!prog[b.vereda]) prog[b.vereda] = new Set();
      prog[b.vereda].add(b.programa_codigo);
    });
    const vColores = this._config?.veredas || {};
    const sorted   = Object.entries(cnt).sort((a,b)=>b[1]-a[1]);

    return `
      <div class="card">
        <div class="card-header">
          <span class="card-header-title">📍 Beneficiarios en mapa</span>
          <span class="card-header-badge">MA · Q1 2026 · ${bs.length}</span>
        </div>
        ${sorted.map(([v,n]) => {
          const col   = (vColores[v]||{}).color || "var(--azul)";
          const pCods = [...(prog[v]||new Set())];
          const iconos= pCods.slice(0,4).map(cod => {
            const p = ps.find(x=>x.codigo===cod);
            return this._config?.iconos?.[p?.tipo_icono]?.emoji || "📋";
          }).join(" ");
          const pct = Math.round((n/bs.length)*100);
          return `
            <div class="vereda-dash-row">
              <div style="width:9px;height:9px;border-radius:2px;background:${col}"></div>
              <span style="font-size:11.5px;font-weight:500;color:var(--texto)">${v}</span>
              <span style="font-size:12px;letter-spacing:1px">${iconos}</span>
              <div style="text-align:right">
                <div style="font-size:12px;font-weight:600;color:var(--marino)">${n}</div>
                <div style="font-size:9px;color:var(--texto-3)">${pct}%</div>
              </div>
            </div>`;
        }).join("")}
      </div>`;
  },

  // ── Vista pública ─────────────────────────────────────────────
  _renderPublica() {
    const d    = this._datos;
    const m    = d?.metricas || {};
    const ps   = d?.programas || [];
    const bs   = d?.beneficiarios || [];
    const cs   = d?.contratos || [];
    const secs = this._config?.secretarias || [];

    // KPIs públicos
    const kpiRow = document.getElementById("pubKpiRow");
    if (kpiRow) {
      kpiRow.innerHTML = [
        { n: (m.pct_global_cuatrienio||0)+"%", l:"Cumplimiento PD" },
        { n: bs.length.toLocaleString("es-CO"),l:"Beneficiarios" },
        { n: API.fmtPeso(cs.reduce((s,c)=>s+(parseFloat(c.valor)||0),0)), l:"Contratado" },
        { n: ps.length, l:"Programas" },
      ].map(x=>`
        <div style="text-align:center">
          <div class="pub-kpi-n">${x.n}</div>
          <div class="pub-kpi-l">${x.l}</div>
        </div>`).join("");
    }

    // Programas — versión ciudadana: resumen por tipo de impacto
    const pubProg = document.getElementById("pubProgramas");
    if (!pubProg) return;

    if (!ps.length) {
      pubProg.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">Información en preparación</div>
          <div class="empty-state-desc">Las secretarías están cargando los informes. Vuelve pronto.</div>
        </div>`;
      return;
    }

    // Agrupar por tipo de icono para el ciudadano
    const grupos = {};
    ps.forEach(p => {
      const key = p.tipo_icono || "general";
      if (!grupos[key]) grupos[key] = { programas: [], benefs: 0 };
      grupos[key].programas.push(p);
      grupos[key].benefs += bs.filter(b=>b.programa_codigo===p.codigo).length;
    });

    const iconos = this._config?.iconos || {};
    pubProg.innerHTML = Object.entries(grupos).map(([tipo, g]) => {
      const ic  = iconos[tipo] || { emoji:"📋", label:"Programa general" };
      const ppa = Math.round(g.programas.reduce((s,p)=>s+(parseFloat(p.pct_pa)||0),0) / g.programas.length);
      const narr= g.programas[0]?.narrativa || "";
      const col = ppa>=75?"var(--verde)":ppa>=40?"#c8a800":"var(--rojo)";
      return `
        <div class="pub-card">
          <div class="pub-card-head">
            <span class="pub-card-ico">${ic.emoji}</span>
            <span class="pub-card-tit">${ic.label}</span>
            <span style="margin-left:auto;font-size:11px;font-weight:600;padding:2px 8px;
              border-radius:20px;background:${ppa>=75?"var(--verde-50)":ppa>=40?"var(--amarillo-50)":"var(--rojo-50)"};
              color:${col}">${ppa}%</span>
          </div>
          ${narr ? `<div class="pub-card-desc">${narr.substring(0,120)}${narr.length>120?"…":""}</div>` : ""}
          ${g.benefs ? `<div style="margin-top:6px;font-size:11px;color:var(--texto-3)">👥 ${g.benefs} beneficiarios atendidos</div>` : ""}
        </div>`;
    }).join("");
  },

  // ── Resumen en la barra de filtros ────────────────────────────
  _actualizarResumenFiltros() {
    const el = document.getElementById("filtroResumen");
    if (!el) return;
    const d = this._datos;
    if (!d) { el.textContent = ""; return; }
    const ps    = d.programas?.length || 0;
    const bs    = d.beneficiarios?.length || 0;
    const secs  = new Set((d.programas||[]).map(p=>p.secretaria)).size;
    const total = (d.contratos||[]).reduce((s,c)=>s+(parseFloat(c.valor)||0),0);
    el.textContent = ps
      ? `${secs} secretarías · ${ps} programas · ${bs} benef. con datos · ${API.fmtPeso(total)}`
      : "";
  }
};
