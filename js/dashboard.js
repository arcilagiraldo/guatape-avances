// ══════════════════════════════════════════════════════════════
// DASHBOARD · v3.0 — Inicio unificado (ejecutivo + ciudadano)
// ══════════════════════════════════════════════════════════════
const DASHBOARD = {

  _datos: null, _config: null,

  render(datos, config) {
    this._datos  = datos;
    this._config = config;
    this._build();
    this._actualizarResumenFiltros();
  },

  _build() {
    const wrap = document.getElementById("inicioContenido");
    if (!wrap) return;
    const d   = this._datos;
    const ps  = d?.programas || [];
    const bs  = d?.beneficiarios || [];
    const cs  = d?.contratos || [];
    const m   = d?.metricas || {};
    const secs= this._config?.secretarias || [];

    if (!ps.length && !bs.length) {
      wrap.innerHTML = `
        <div style="text-align:center;padding:5rem 2rem;color:var(--texto-3)">
          <div style="font-size:52px;margin-bottom:1rem;opacity:.35">📊</div>
          <div style="font-size:15px;font-weight:500;color:var(--texto-2);margin-bottom:8px">Aún no hay datos cargados</div>
          <div style="font-size:12px;color:var(--texto-3);max-width:360px;margin:0 auto;line-height:1.7">
            Ve al panel ⚙️ → Admin para cargar el Plan de Desarrollo, el Plan de Acción y los informes trimestrales.
          </div>
        </div>`;
      return;
    }

    const pctGlobal  = parseFloat(m.pct_global_cuatrienio || 0);
    const totalCont  = cs.reduce((s,c) => s + (parseFloat(c.valor)||0), 0);
    const enMeta     = ps.filter(p => parseFloat(p.pct_pa) >= 75).length;
    const alertas    = this._calcularAlertas(ps, cs);
    const periodos   = m.periodos_con_datos || [];
    const sMap       = {}; secs.forEach(s => sMap[s.id] = s);

    wrap.innerHTML = `
      ${this._htmlHero(pctGlobal, periodos)}
      ${this._htmlKpis(ps, bs, cs, pctGlobal, totalCont, enMeta, alertas)}
      ${this._htmlSecretarias(ps, secs)}
      <div class="inicio-dos-col">
        <div>${this._htmlAlertas(alertas, cs, ps)}</div>
        <div>${this._htmlContratos(cs, sMap)}</div>
      </div>
      ${this._htmlBeneficiarios(bs, ps)}
      ${this._htmlCiudadano(ps, bs, cs, m)}
    `;
  },

  // ── Hero ─────────────────────────────────────────────────────
  _htmlHero(pct, periodos) {
    const col = pct >= 75 ? "#078838" : pct >= 40 ? "#c8a800" : "#a32d2d";
    const per = periodos.length ? periodos.join(" · ") : "Sin períodos reportados";
    return `
      <div class="inicio-hero">
        <div class="inicio-hero-left">
          <div class="inicio-hero-eyebrow">Alcaldía de Guatapé · Antioquia</div>
          <h1 class="inicio-hero-titulo">Juntos Construimos Guatapé</h1>
          <div class="inicio-hero-periodo">Plan de Desarrollo 2024–2027 · ${per}</div>
        </div>
        <div class="inicio-hero-right">
          <div class="inicio-pct-circulo" style="--pct-color:${col}">
            <span class="inicio-pct-num">${pct}%</span>
            <span class="inicio-pct-lbl">Cumplimiento<br>Plan Desarrollo</span>
          </div>
        </div>
      </div>`;
  },

  // ── KPIs clickables ───────────────────────────────────────────
  _htmlKpis(ps, bs, cs, pct, totalCont, enMeta, alertas) {
    const kpis = [
      { ico:"📋", num: ps.length,                      lbl:"Programas",      sub:`🟢 ${enMeta} en meta`,                          tipo:"programas" },
      { ico:"👥", num: bs.length.toLocaleString("es-CO"), lbl:"Beneficiarios", sub:`${[...new Set(bs.map(b=>b.vereda))].length} veredas`, tipo:"beneficiarios" },
      { ico:"💰", num: API.fmtPeso(totalCont),          lbl:"Contratado",     sub:`${cs.length} contratos activos`,                tipo:"contratos" },
      { ico: alertas.criticas > 0 ? "⚠️" : "✅",
        num: alertas.criticas > 0 ? alertas.criticas : enMeta,
        lbl: alertas.criticas > 0 ? "Requieren atención" : "Programas en meta",
        sub: alertas.criticas > 0 ? "programas rezagados" : "≥ 75% del PA",
        tipo:"alertas" },
    ];
    return `
      <div class="inicio-kpis">
        ${kpis.map(k => `
          <button class="inicio-kpi" onclick="DASHBOARD.mostrarDetalle('${k.tipo}')">
            <span class="inicio-kpi-ico">${k.ico}</span>
            <span class="inicio-kpi-num">${k.num}</span>
            <span class="inicio-kpi-lbl">${k.lbl}</span>
            <span class="inicio-kpi-sub">${k.sub}</span>
            <span class="inicio-kpi-ver">Ver detalle →</span>
          </button>`).join("")}
      </div>`;
  },

  // ── Progreso por secretaría ───────────────────────────────────
  _htmlSecretarias(ps, secs) {
    if (!secs.length) return "";
    const filas = secs.map(sec => {
      const mios = ps.filter(p => p.secretaria === sec.id);
      if (!mios.length) return null;
      const ppa = Math.round(mios.reduce((s,p)=>s+(parseFloat(p.pct_pa)||0),0)/mios.length);
      const ppd = Math.round(mios.reduce((s,p)=>s+(parseFloat(p.pct_pd)||0),0)/mios.length);
      const col = ppa>=75?"var(--verde)":ppa>=40?"#c8a800":"var(--rojo)";
      return { sec, mios, ppa, ppd, col };
    }).filter(Boolean);

    if (!filas.length) return "";

    return `
      <div class="inicio-secs-wrap">
        <div class="inicio-secs-titulo">Avance por secretaría</div>
        <div class="inicio-secs-grid">
          ${filas.map(f => `
            <div class="inicio-sec-card" onclick="DASHBOARD.mostrarDetalle('sec_${f.sec.id}')">
              <div class="inicio-sec-head">
                <span class="inicio-sec-ico">${f.sec.icono||"🏛️"}</span>
                <span class="inicio-sec-nom">${f.sec.nombre||f.sec.id}</span>
                <span class="inicio-sec-pct" style="color:${f.col}">${f.ppa}%</span>
              </div>
              <div class="inicio-barra-wrap">
                <div class="inicio-barra-fill" style="width:${Math.min(f.ppa,100)}%;background:${f.col}"></div>
              </div>
              <div class="inicio-sec-meta">
                <span>${f.mios.length} programas</span>
                <span>PD: ${f.ppd}%</span>
              </div>
            </div>`).join("")}
        </div>
      </div>`;
  },

  // ── Alertas ───────────────────────────────────────────────────
  _calcularAlertas(ps, cs) {
    const rezagados = ps.filter(p => parseFloat(p.pct_pa) > 0 && parseFloat(p.pct_pa) < 40);
    const sinInicio = cs.filter(c => (c.objeto||"").toLowerCase().includes("preoperativ"));
    return { criticas: rezagados.length + sinInicio.length, rezagados, sinInicio };
  },

  _htmlAlertas(alertas, cs, ps) {
    const items = [];
    alertas.rezagados.slice(0,3).forEach(p => items.push({
      color:"var(--rojo)", titulo: p.nombre?.substring(0,40)+"…"||"Programa",
      desc: `PA: ${(parseFloat(p.pct_pa)||0).toFixed(0)}% — Rezagado`
    }));
    ps.filter(p => parseFloat(p.pct_pa) >= 100).slice(0,2).forEach(p => items.push({
      color:"var(--verde)", titulo:"✅ "+p.nombre?.substring(0,38)||"Programa",
      desc: "Cumplimiento al 100%"
    }));
    if (!items.length) return `
      <div class="dash-card">
        <div class="dash-card-hdr"><span>🔔 Seguimiento</span></div>
        <div class="dash-card-empty">Sin alertas activas</div>
      </div>`;
    return `
      <div class="dash-card">
        <div class="dash-card-hdr">
          <span>🔔 Seguimiento</span>
          <span class="dash-badge">${items.length} items</span>
        </div>
        ${items.map(a=>`
          <div class="dash-alerta-row">
            <div class="dash-alerta-dot" style="background:${a.color}"></div>
            <div>
              <div class="dash-alerta-tit">${a.titulo}</div>
              <div class="dash-alerta-sub">${a.desc}</div>
            </div>
          </div>`).join("")}
      </div>`;
  },

  // ── Contratos ─────────────────────────────────────────────────
  _htmlContratos(cs, sMap) {
    if (!cs.length) return `
      <div class="dash-card">
        <div class="dash-card-hdr"><span>💰 Contratos</span></div>
        <div class="dash-card-empty">Sin contratos registrados</div>
      </div>`;
    const top   = [...cs].sort((a,b)=>(parseFloat(b.valor)||0)-(parseFloat(a.valor)||0)).slice(0,5);
    const total = cs.reduce((s,c)=>s+(parseFloat(c.valor)||0),0);
    return `
      <div class="dash-card">
        <div class="dash-card-hdr">
          <span>💰 Contratos · Top 5</span>
          <span class="dash-badge" style="cursor:pointer" onclick="APP._ir('contratos')">${cs.length} total →</span>
        </div>
        ${top.map(c=>`
          <div class="dash-cont-row">
            <div>
              <div style="font-size:10px;font-weight:600;color:var(--azul-dark);font-family:monospace">${c.numero||"—"}</div>
              <div style="font-size:11px;color:var(--texto-2);line-height:1.4">${(c.objeto||"—").substring(0,52)}…</div>
            </div>
            <div style="font-size:11.5px;font-weight:700;color:var(--marino);white-space:nowrap">${API.fmtPeso(c.valor)}</div>
          </div>`).join("")}
        <div style="padding:6px 12px;font-size:11px;color:var(--texto-3)">Total: <strong>${API.fmtPeso(total)}</strong></div>
      </div>`;
  },

  // ── Beneficiarios ─────────────────────────────────────────────
  _htmlBeneficiarios(bs, ps) {
    if (!bs.length) return "";
    const cnt = {}, prog = {};
    bs.forEach(b => {
      cnt[b.vereda] = (cnt[b.vereda]||0)+1;
      if (!prog[b.vereda]) prog[b.vereda] = new Set();
      prog[b.vereda].add(b.programa_codigo);
    });
    const vCol  = this._config?.veredas || {};
    const sorted= Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,8);
    return `
      <div class="inicio-veredas-wrap">
        <div class="inicio-secs-titulo">Beneficiarios por vereda</div>
        <div class="inicio-veredas-grid">
          ${sorted.map(([v,n])=>{
            const col  = (vCol[v]||{}).color||"var(--azul)";
            const pct  = Math.round((n/bs.length)*100);
            const icos = [...(prog[v]||new Set())].slice(0,3).map(cod=>{
              const p = ps.find(x=>x.codigo===cod);
              return this._config?.iconos?.[p?.tipo_icono]?.emoji||"📋";
            }).join("");
            return `
              <div class="inicio-vereda-card" onclick="DASHBOARD.mostrarDetalle('vereda_${v}')">
                <div class="inicio-vereda-dot" style="background:${col}"></div>
                <div class="inicio-vereda-info">
                  <span class="inicio-vereda-nom">${v}</span>
                  <span class="inicio-vereda-icos">${icos}</span>
                </div>
                <div class="inicio-vereda-n">
                  <strong>${n}</strong>
                  <span>${pct}%</span>
                </div>
              </div>`;
          }).join("")}
        </div>
      </div>`;
  },

  // ── Sección ciudadana (antes Vista Pública) ───────────────────
  _htmlCiudadano(ps, bs, cs, m) {
    if (!ps.length) return "";
    const iconos  = this._config?.iconos || {};
    const grupos  = {};
    ps.forEach(p => {
      const k = p.tipo_icono||"general";
      if (!grupos[k]) grupos[k] = { programas:[], benefs:0 };
      grupos[k].programas.push(p);
      grupos[k].benefs += bs.filter(b=>b.programa_codigo===p.codigo).length;
    });
    const cards = Object.entries(grupos).map(([tipo, g]) => {
      const ic  = iconos[tipo]||{emoji:"📋",label:"Programa"};
      const ppa = Math.round(g.programas.reduce((s,p)=>s+(parseFloat(p.pct_pa)||0),0)/g.programas.length);
      const col = ppa>=75?"var(--verde)":ppa>=40?"#c8a800":"var(--rojo)";
      const bg  = ppa>=75?"var(--verde-50)":ppa>=40?"var(--amarillo-50)":"var(--rojo-50)";
      const narr= g.programas.find(p=>p.narrativa)?.narrativa||"";
      return `
        <div class="ciudad-card" onclick="DASHBOARD.mostrarDetalle('grupo_${tipo}')">
          <div class="ciudad-card-ico">${ic.emoji}</div>
          <div class="ciudad-card-body">
            <div class="ciudad-card-tit">${ic.label}</div>
            ${narr?`<div class="ciudad-card-narr">${narr.substring(0,100)}${narr.length>100?"…":""}</div>`:""}
            ${g.benefs?`<div class="ciudad-card-benef">👥 ${g.benefs} beneficiarios</div>`:""}
          </div>
          <div class="ciudad-card-pct" style="background:${bg};color:${col}">${ppa}%</div>
        </div>`;
    }).join("");

    return `
      <div class="inicio-ciudadano">
        <div class="inicio-ciudadano-titulo">¿Qué estamos haciendo por Guatapé?</div>
        <div class="inicio-ciudadano-sub">Avance por área de impacto · Plan de Acción 2026</div>
        <div class="ciudad-cards-grid">${cards}</div>
      </div>`;
  },

  // ── Panel de detalle ──────────────────────────────────────────
  mostrarDetalle(tipo) {
    const d   = this._datos;
    const ps  = d?.programas || [];
    const bs  = d?.beneficiarios || [];
    const cs  = d?.contratos || [];
    const secs= this._config?.secretarias || [];
    let titulo = "", html = "";

    if (tipo === "programas") {
      titulo = `📋 ${ps.length} Programas del Plan de Acción`;
      html = `<div class="det-tabla">${ps.map(p=>{
        const ppa=(parseFloat(p.pct_pa)||0).toFixed(0);
        const col=ppa>=75?"var(--verde)":ppa>=40?"#c8a800":"var(--rojo)";
        const ico=this._config?.iconos?.[p.tipo_icono]?.emoji||"📋";
        return `<div class="det-fila">
          <span style="font-size:16px">${ico}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--texto)">${p.nombre||"—"}</div>
            <div style="font-size:10.5px;color:var(--texto-3)">${p.secretaria||""} · ${p.anio||""} Q${p.trimestre||"—"}</div>
            ${p.narrativa?`<div style="font-size:11px;color:var(--texto-2);margin-top:2px;line-height:1.5">${p.narrativa.substring(0,100)}…</div>`:""}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:14px;font-weight:700;color:${col}">${ppa}% PA</div>
            <div style="font-size:10px;color:var(--texto-3)">PD ${(parseFloat(p.pct_pd)||0).toFixed(0)}%</div>
          </div>
        </div>`}).join("")}</div>`;

    } else if (tipo === "beneficiarios") {
      titulo = `👥 ${bs.length} Beneficiarios registrados`;
      html = `<div class="det-tabla">${bs.map(b=>`
        <div class="det-fila">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:500">${b.nombre||"—"}</div>
            <div style="font-size:10.5px;color:var(--texto-3)">${b.vereda||""} · ${b.tipo_beneficio||""}</div>
            ${b.detalle?`<div style="font-size:11px;color:var(--texto-2)">${b.detalle}</div>`:""}
          </div>
          <span style="font-size:11px;color:var(--texto-3);white-space:nowrap">${b.anio||""} Q${b.trimestre||""}</span>
        </div>`).join("")}</div>`;

    } else if (tipo === "contratos") {
      titulo = `💰 ${cs.length} Contratos`;
      const total = cs.reduce((s,c)=>s+(parseFloat(c.valor)||0),0);
      html = `<div style="padding:8px 0 4px;font-size:12px;color:var(--texto-2);font-weight:600">Total: ${API.fmtPeso(total)}</div>
        <div class="det-tabla">${[...cs].sort((a,b)=>(parseFloat(b.valor)||0)-(parseFloat(a.valor)||0)).map(c=>`
        <div class="det-fila">
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;font-family:monospace;font-weight:600;color:var(--azul-dark)">${c.numero||"—"}</div>
            <div style="font-size:11.5px;font-weight:500">${(c.objeto||"—").substring(0,70)}</div>
            <div style="font-size:10.5px;color:var(--texto-3)">${c.secretaria||""} · ${c.contratista||""}</div>
          </div>
          <div style="font-size:12px;font-weight:700;color:var(--marino);white-space:nowrap">${API.fmtPeso(c.valor)}</div>
        </div>`).join("")}</div>`;

    } else if (tipo === "alertas") {
      titulo = "🔔 Seguimiento y alertas";
      const al = this._calcularAlertas(ps, cs);
      const enMeta = ps.filter(p=>parseFloat(p.pct_pa)>=75);
      html = `
        ${al.rezagados.length ? `<div style="font-size:11.5px;font-weight:600;color:var(--rojo);margin:8px 0 4px">⚠️ Programas rezagados (PA &lt; 40%)</div>
          <div class="det-tabla">${al.rezagados.map(p=>`<div class="det-fila">
            <div style="flex:1"><div style="font-size:12px;font-weight:500">${p.nombre||"—"}</div>
            <div style="font-size:10.5px;color:var(--texto-3)">${p.secretaria}</div></div>
            <div style="font-size:13px;font-weight:700;color:var(--rojo)">${(parseFloat(p.pct_pa)||0).toFixed(0)}% PA</div>
          </div>`).join("")}</div>` : ""}
        ${enMeta.length ? `<div style="font-size:11.5px;font-weight:600;color:var(--verde);margin:12px 0 4px">✅ En meta o superada (PA ≥ 75%)</div>
          <div class="det-tabla">${enMeta.map(p=>`<div class="det-fila">
            <div style="flex:1"><div style="font-size:12px;font-weight:500">${p.nombre||"—"}</div>
            <div style="font-size:10.5px;color:var(--texto-3)">${p.secretaria}</div></div>
            <div style="font-size:13px;font-weight:700;color:var(--verde)">${(parseFloat(p.pct_pa)||0).toFixed(0)}% PA</div>
          </div>`).join("")}</div>` : ""}`;

    } else if (tipo.startsWith("sec_")) {
      const secId = tipo.replace("sec_","");
      const sec   = secs.find(s=>s.id===secId)||{nombre:secId};
      const mios  = ps.filter(p=>p.secretaria===secId);
      titulo = `${sec.icono||"🏛️"} ${sec.nombre||secId} · ${mios.length} programas`;
      html = `<div class="det-tabla">${mios.map(p=>{
        const ppa=(parseFloat(p.pct_pa)||0).toFixed(0);
        const col=ppa>=75?"var(--verde)":ppa>=40?"#c8a800":"var(--rojo)";
        return `<div class="det-fila">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600">${p.nombre||"—"}</div>
            ${p.narrativa?`<div style="font-size:11px;color:var(--texto-2);line-height:1.5;margin-top:2px">${p.narrativa.substring(0,120)}…</div>`:""}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:14px;font-weight:700;color:${col}">${ppa}%</div>
            <div style="font-size:10px;color:var(--texto-3)">Plan Acción</div>
          </div>
        </div>`;}).join("")}</div>`;

    } else if (tipo.startsWith("vereda_")) {
      const vereda = tipo.replace("vereda_","");
      const bvs    = bs.filter(b=>b.vereda===vereda);
      titulo = `📍 ${vereda} · ${bvs.length} beneficiarios`;
      html = `<div class="det-tabla">${bvs.map(b=>`
        <div class="det-fila">
          <div style="flex:1">
            <div style="font-size:12px;font-weight:500">${b.nombre||"—"}</div>
            <div style="font-size:10.5px;color:var(--texto-3)">${b.tipo_beneficio||""} · ${b.detalle||""}</div>
          </div>
        </div>`).join("")}</div>`;

    } else if (tipo.startsWith("grupo_")) {
      const gKey  = tipo.replace("grupo_","");
      const ic    = (this._config?.iconos||{})[gKey]||{emoji:"📋",label:"Programa"};
      const mios  = ps.filter(p=>(p.tipo_icono||"general")===gKey);
      titulo = `${ic.emoji} ${ic.label} · ${mios.length} programas`;
      html = `<div class="det-tabla">${mios.map(p=>{
        const ppa=(parseFloat(p.pct_pa)||0).toFixed(0);
        const col=ppa>=75?"var(--verde)":ppa>=40?"#c8a800":"var(--rojo)";
        const bens=bs.filter(b=>b.programa_codigo===p.codigo).length;
        return `<div class="det-fila">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600">${p.nombre||"—"}</div>
            <div style="font-size:10.5px;color:var(--texto-3)">${p.secretaria} ${bens?`· 👥 ${bens} benef.`:""}</div>
            ${p.narrativa?`<div style="font-size:11px;color:var(--texto-2);margin-top:2px">${p.narrativa.substring(0,100)}…</div>`:""}
          </div>
          <div style="font-size:14px;font-weight:700;color:${col};flex-shrink:0">${ppa}% PA</div>
        </div>`;}).join("")}</div>`;
    }

    document.getElementById("detalleTitulo").textContent = titulo;
    document.getElementById("detalleContenido").innerHTML = html;
    document.getElementById("detalleOverlay").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  },

  cerrarDetalle(e) {
    if (e && e.target !== document.getElementById("detalleOverlay")) return;
    document.getElementById("detalleOverlay").classList.add("hidden");
    document.body.style.overflow = "";
  },

  // ── Resumen filtros ───────────────────────────────────────────
  _actualizarResumenFiltros() {
    const el = document.getElementById("filtroResumen");
    if (!el) return;
    const d = this._datos;
    if (!d) { el.textContent = ""; return; }
    const ps    = d.programas?.length||0;
    const bs    = d.beneficiarios?.length||0;
    const secs  = new Set((d.programas||[]).map(p=>p.secretaria)).size;
    const total = (d.contratos||[]).reduce((s,c)=>s+(parseFloat(c.valor)||0),0);
    el.textContent = ps ? `${secs} secretarías · ${ps} programas · ${bs} benef. · ${API.fmtPeso(total)}` : "";
  }
};
