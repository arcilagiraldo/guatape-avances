// ══════════════════════════════════════════════════════
// LOGROS · v2.1
// ══════════════════════════════════════════════════════
const LOGROS = {
  _datos:  null,
  _config: null,

  render(datos, config) {
    this._datos  = datos;
    this._config = config;
    this._stats();
    this._secretarias();
  },

  _stats() {
    const p = this._datos?.programas     || [];
    const b = this._datos?.beneficiarios || [];
    const c = this._datos?.contratos     || [];
    const m = this._datos?.metricas      || {};
    const valTotal = c.reduce((s, x) => s + (parseFloat(x.valor) || 0), 0);

    document.getElementById("statsGlobales").innerHTML = [
      { num: p.length,                             lbl: "Programas activos",    icono: "📋" },
      { num: b.length.toLocaleString("es-CO"),     lbl: "Beneficiarios",        icono: "👥" },
      { num: (m.pct_global_cuatrienio || 0) + "%", lbl: "Cumplimiento PD",      icono: "🏁" },
      { num: API.fmtPeso(valTotal),                lbl: "En contratos",         icono: "💰" },
    ].map(x => `
      <div class="stat-card">
        <div style="font-size:22px;margin-bottom:6px;">${x.icono}</div>
        <div class="num">${x.num}</div>
        <div class="lbl">${x.lbl}</div>
      </div>`).join("");
  },

  _secretarias() {
    const prog   = this._datos?.programas  || [];
    const conts  = this._datos?.contratos  || [];
    const benefs = this._datos?.beneficiarios || [];
    const secs   = this._config?.secretarias || [];
    const iconos = this._config?.iconos || {};

    // Agrupados por secretaría
    const pS = {}, cS = {}, bS = {};
    prog.forEach(p   => { if (!pS[p.secretaria]) pS[p.secretaria] = []; pS[p.secretaria].push(p); });
    conts.forEach(c  => { if (!cS[c.secretaria]) cS[c.secretaria] = []; cS[c.secretaria].push(c); });
    benefs.forEach(b => { if (!bS[b.secretaria]) bS[b.secretaria] = []; bS[b.secretaria].push(b); });

    const grid = document.getElementById("secretariasGrid");
    if (!grid) return;
    grid.innerHTML = "";

    // Estado vacío
    const hayDatos = secs.some(s => (pS[s.id] || []).length > 0);
    if (!hayDatos) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-title">Aún no hay datos de logros</div>
          <div class="empty-state-desc">
            Las secretarías deben subir sus informes trimestrales desde el panel administrativo.
            Una vez procesados, los logros aparecerán aquí.
          </div>
        </div>`;
      return;
    }

    secs.forEach(sec => {
      const ps  = pS[sec.id] || [];
      if (!ps.length) return;

      const pct = ps.length
        ? (ps.reduce((s, p) => s + (parseFloat(p.pct_pa) || 0), 0) / ps.length).toFixed(0)
        : 0;
      const nBenef = (bS[sec.id] || []).length;
      const nConts = (cS[sec.id] || []).length;

      const card = document.createElement("div");
      card.className = "sec-card";
      // ¿Tiene ejecución real o solo plan base?
      const tieneEjecucion = ps.some(p => parseFloat(p.ejecutado_trimestre) > 0 || (parseFloat(p.pct_pa) > 0 && p.trimestre !== "0"));
      const estadoBadge = tieneEjecucion
        ? `<div class="sec-ring">${this._ring(pct,sec.color)}<div class="sec-ring-pct" style="color:${sec.color}">${pct}%</div></div>`
        : `<div style="font-size:11px;color:var(--texto-3);background:var(--bg);padding:4px 10px;border-radius:20px;white-space:nowrap">⏳ Sin informes</div>`;

      card.innerHTML = `
        <div class="sec-card-head" onclick="this.nextElementSibling.classList.toggle('open')">
          <div class="sec-avatar" style="background:${sec.color}20;">${sec.icono}</div>
          <div class="sec-info">
            <strong>${sec.nombre}</strong>
            <span>${ps.length} programas · ${nConts} contratos · ${nBenef} benef.</span>
          </div>
          ${estadoBadge}
        </div>
        <div class="sec-card-body">
          ${tieneEjecucion ? this._resumenSec(ps, cS[sec.id]||[], nBenef) : `
            <div style="padding:12px 1.125rem;background:var(--amarillo-50);border-bottom:.5px solid var(--borde)">
              <div style="font-size:11.5px;color:#8a7000;display:flex;align-items:center;gap:7px">
                <span>⏳</span>
                <span>Esta secretaría aún no ha cargado sus informes de ejecución. 
                  Los programas del Plan de Acción 2026 ya están precargados — 
                  al subir el primer informe trimestral los avances aparecerán aquí.</span>
              </div>
            </div>`}
          ${ps.map(p => this._prog(p, cS[sec.id] || [], iconos)).join("")}
        </div>`;
      grid.appendChild(card);
    });
  },

  _resumenSec(ps, cs, nBenef) {
    const valTotal = cs.reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
    const alto  = ps.filter(p => parseFloat(p.pct_pa) >= 75).length;
    const medio = ps.filter(p => parseFloat(p.pct_pa) >= 40 && parseFloat(p.pct_pa) < 75).length;
    const bajo  = ps.filter(p => parseFloat(p.pct_pa) > 0  && parseFloat(p.pct_pa) < 40).length;
    return `
      <div style="display:flex;gap:8px;padding:10px 1.25rem;border-bottom:.5px solid var(--gris-borde);flex-wrap:wrap;">
        <div style="font-size:11px;background:var(--verde-claro);color:var(--verde-oscuro);padding:3px 8px;border-radius:4px;">🟢 ${alto} en meta</div>
        ${medio ? `<div style="font-size:11px;background:var(--dorado-claro);color:var(--dorado);padding:3px 8px;border-radius:4px;">🟡 ${medio} en progreso</div>` : ""}
        ${bajo  ? `<div style="font-size:11px;background:var(--rojo-claro);color:var(--rojo);padding:3px 8px;border-radius:4px;">🔴 ${bajo} rezagados</div>` : ""}
        ${nBenef ? `<div style="font-size:11px;background:var(--azul-claro);color:var(--azul);padding:3px 8px;border-radius:4px;">👥 ${nBenef} benef.</div>` : ""}
        ${valTotal ? `<div style="font-size:11px;background:var(--gris-bg);color:var(--texto-2);padding:3px 8px;border-radius:4px;">💰 ${API.fmtPeso(valTotal)}</div>` : ""}
      </div>`;
  },

  _prog(p, cs, iconos) {
    const pct = parseFloat(p.pct_pa) || 0;
    const cls = pct >= 75 ? "alto" : pct >= 40 ? "medio" : pct > 0 ? "bajo" : "cero";
    const col = pct >= 75 ? "#1D9E75" : pct >= 40 ? "#BA7517" : pct > 0 ? "#A32D2D" : "#9B9A96";
    const ic  = (iconos[p.tipo_icono] || { emoji: "📋" });
    const cp  = cs.filter(c => c.programa_codigo === p.codigo);

    return `
      <div class="programa-row">
        <div class="prog-header">
          <div class="prog-icono">${ic.emoji}</div>
          <div class="prog-titulo">${p.nombre || "Sin nombre"}
            ${p.codigo ? `<span style="font-size:10px;color:#9B9A96;font-weight:400;margin-left:4px;">${p.codigo}</span>` : ""}
          </div>
          <div class="prog-pct ${cls}">${pct}%</div>
        </div>
        <div class="prog-barra-bg">
          <div class="prog-barra-fill" style="width:${Math.min(pct, 100)}%;background:${col};"></div>
        </div>
        <div class="prog-meta">
          <span>Meta 2026: <strong>${p.meta_2026 || "—"} ${p.unidad || ""}</strong></span>
          <span>Ejecutado: <strong>${p.ejecutado_trimestre || 0} ${p.unidad || ""}</strong></span>
          ${p.pct_pd ? `<span>PD: <strong style="color:${col}">${parseFloat(p.pct_pd).toFixed(0)}%</strong></span>` : ""}
        </div>
        ${p.narrativa ? `<div class="prog-narrativa">${p.narrativa}</div>` : ""}
        ${cp.length ? `<div class="contratos-prog">${cp.map(c =>
          `<span class="contrato-chip" title="${c.objeto || ""}">${c.numero || "Contrato"} · ${API.fmtPeso(c.valor)}</span>`
        ).join("")}</div>` : ""}
      </div>`;
  },

  _ring(pct, color) {
    const r   = 18;
    const ci  = 2 * Math.PI * r;
    const off = ci - (Math.min(pct, 100) / 100) * ci;
    return `<svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="${r}" fill="none" stroke="#F1EFE8" stroke-width="3"/>
      <circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="3"
              stroke-dasharray="${ci}" stroke-dashoffset="${off}"
              stroke-linecap="round" transform="rotate(-90 22 22)"/>
    </svg>`;
  }
};
