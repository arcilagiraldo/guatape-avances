// ══════════════════════════════════════════════════════
// CUATRIENIO · v2.1
// ══════════════════════════════════════════════════════
const CUATRIENIO = {
  render(datos, config) {
    const m       = datos?.metricas  || {};
    const pd      = datos?.metasPD   || [];
    const secs    = config?.secretarias || [];
    const pct     = parseFloat(m.pct_global_cuatrienio || 0);
    const periodos= m.periodos_con_datos || [];

    this._hero(pct, periodos, m);
    this._porSec(m.por_secretaria || {}, secs);
    this._timeline(periodos);
    this._grafico(pd);
  },

  _hero(pct, periodos, m) {
    const el = document.getElementById("cuatrienioHero");
    if (!el) return;

    const sinDatos = periodos.length === 0;
    el.innerHTML = `
      <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:8px;">
        Plan de Desarrollo · 2024–2027
      </div>
      <div class="cuatrienio-pct">${pct}%</div>
      <div class="cuatrienio-label">de cumplimiento global acumulado</div>

      ${sinDatos
        ? `<div style="margin-top:16px;font-size:12px;color:rgba(255,255,255,.4);font-style:italic;">
             Sin datos aún — sube el primer informe trimestral para ver el avance
           </div>`
        : `<div style="margin-top:14px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
             ${periodos.map(p => `<span style="background:rgba(255,255,255,.1);color:rgba(255,255,255,.75);font-size:11px;padding:3px 10px;border-radius:20px;">${p}</span>`).join("")}
           </div>`
      }

      <div style="margin-top:20px;background:rgba(255,255,255,.1);border-radius:8px;height:8px;overflow:hidden;">
        <div style="height:100%;background:#9FE1CB;border-radius:8px;width:${Math.min(pct, 100)}%;transition:width 1.2s ease;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:rgba(255,255,255,.35);">
        <span>0%</span>
        <span>Meta: 100% al 31-Dic-2027</span>
      </div>

      ${m.total_beneficiarios || m.total_programas || m.total_contratos ? `
        <div style="display:flex;gap:16px;justify-content:center;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);">
          ${m.total_programas    ? `<div style="text-align:center;"><div style="font-size:1.4rem;font-weight:600;color:#9FE1CB;">${m.total_programas}</div><div style="font-size:10px;color:rgba(255,255,255,.45);">Programas</div></div>` : ""}
          ${m.total_beneficiarios? `<div style="text-align:center;"><div style="font-size:1.4rem;font-weight:600;color:#9FE1CB;">${m.total_beneficiarios}</div><div style="font-size:10px;color:rgba(255,255,255,.45);">Beneficiarios</div></div>` : ""}
          ${m.total_contratos    ? `<div style="text-align:center;"><div style="font-size:1.4rem;font-weight:600;color:#9FE1CB;">${m.total_contratos}</div><div style="font-size:10px;color:rgba(255,255,255,.45);">Contratos</div></div>` : ""}
          ${m.total_contratado   ? `<div style="text-align:center;"><div style="font-size:1.4rem;font-weight:600;color:#9FE1CB;">${API.fmtPeso(m.total_contratado)}</div><div style="font-size:10px;color:rgba(255,255,255,.45);">Contratado</div></div>` : ""}
        </div>` : ""}`;
  },

  _porSec(porSec, secs) {
    const el = document.getElementById("cuatrienioDetalle");
    if (!el) return;
    el.innerHTML = "";

    const conDatos = secs.filter(s => porSec[s.id]);
    if (!conDatos.length) {
      el.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;padding:2rem;">
          <div class="empty-state-desc">El avance por secretaría aparecerá aquí una vez que se suban informes.</div>
        </div>`;
      return;
    }

    conDatos.forEach(sec => {
      const d   = porSec[sec.id];
      const pct = parseFloat(d.promedio || 0);
      const col = pct >= 75 ? "#1D9E75" : pct >= 40 ? "#BA7517" : "#A32D2D";
      const estado = pct >= 75 ? "🟢 En meta" : pct >= 40 ? "🟡 En progreso" : pct > 0 ? "🔴 Rezagado" : "⚪ Sin datos";

      const c = document.createElement("div");
      c.className = "sec-pd-card";
      c.innerHTML = `
        <h4 style="color:${sec.color};">${sec.icono} ${sec.nombre}</h4>
        <div class="pd-barra-wrap">
          <div class="pd-barra-bg">
            <div class="pd-barra-fill" style="width:${Math.min(pct, 100)}%;background:${col};"></div>
          </div>
          <div class="pd-pct-label" style="color:${col};">${pct}%</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#9B9A96;margin-top:2px;">
          <span>${d.count || 0} indicadores</span>
          <span>${estado}</span>
        </div>`;
      el.appendChild(c);
    });
  },

  _timeline(periodos) {
    const todos = [
      "2024-Q1","2024-Q2","2024-Q3","2024-Q4",
      "2025-Q1","2025-Q2","2025-Q3","2025-Q4",
      "2026-Q1","2026-Q2","2026-Q3","2026-Q4",
      "2027-Q1","2027-Q2","2027-Q3","2027-Q4"
    ];
    const hoy = new Date();
    const el  = document.getElementById("timelineWrap");
    if (!el) return;

    el.innerHTML = `
      <div class="timeline-title">📅 Trimestres del cuatrienio 2024–2027</div>
      <div class="timeline-grid">
        ${todos.map(p => {
          const [a, q] = p.split("-");
          const qNum   = parseInt(q.replace("Q",""));
          const inicio = new Date(parseInt(a), (qNum - 1) * 3, 1);
          const fin    = new Date(parseInt(a), qNum * 3, 0);
          const tieneD = periodos.includes(p);
          const esFut  = hoy < inicio;
          const esActual = hoy >= inicio && hoy <= fin;

          return `
            <div class="trimestre-card ${tieneD ? "activo" : ""}" style="${esActual && !tieneD ? "border-color:var(--dorado);background:var(--dorado-claro);" : ""}">
              <div class="trim-label">${p}</div>
              <div class="trim-pct" style="font-size:1.2rem;">
                ${tieneD ? "✅" : esFut ? "🔜" : esActual ? "⏳" : "—"}
              </div>
              <div class="trim-sub" style="${esActual ? "color:var(--dorado);" : ""}">
                ${tieneD ? "Con datos" : esFut ? "Futuro" : esActual ? "En curso" : "Sin datos"}
              </div>
            </div>`;
        }).join("")}
      </div>`;
  },

  _grafico(pd) {
    // Limpiar gráfico anterior si existe
    const prev = document.getElementById("graficoPD");
    if (prev) prev.remove();

    if (!pd || !pd.length) return;

    const top = pd
      .filter(m => m.meta_cuatrienio > 0)
      .sort((a, b) => (parseFloat(b.pct_pd) || 0) - (parseFloat(a.pct_pd) || 0))
      .slice(0, 12);
    if (!top.length) return;

    const bH = 28, gap = 6, pL = 210, pR = 80, W = 720;
    const tH = top.length * (bH + gap) + 50;

    const bars = top.map((m, i) => {
      const pct = Math.min(parseFloat(m.pct_pd) || 0, 100);
      const col = pct >= 75 ? "#1D9E75" : pct >= 40 ? "#BA7517" : "#A32D2D";
      const bW  = Math.max(2, ((W - pL - pR) * pct / 100));
      const y   = i * (bH + gap) + 30;
      const lbl = (m.indicador || "Sin nombre").substring(0, 32) + ((m.indicador || "").length > 32 ? "…" : "");

      return `
        <text x="${pL - 10}" y="${y + bH/2 + 4}" text-anchor="end" font-size="11" fill="#5F5E5A">${lbl}</text>
        <rect x="${pL}" y="${y}" width="${bW}" height="${bH}" rx="4" fill="${col}" opacity=".85"/>
        <text x="${pL + bW + 8}" y="${y + bH/2 + 4}" font-size="11" font-weight="600" fill="${col}">${pct.toFixed(0)}%</text>
        <text x="${pL - 10}" y="${y + bH/2 + 4}" text-anchor="end" font-size="9" fill="#9B9A96" dy="12">
          ${m.avance_acumulado || 0} / ${m.meta_cuatrienio || 0} ${m.unidad || ""}
        </text>`;
    }).join("");

    const wrap = document.createElement("div");
    wrap.id = "graficoPD";
    wrap.style.cssText = "background:#fff;border:.5px solid rgba(0,0,0,.08);border-radius:12px;padding:1.25rem;margin-top:1rem;overflow-x:auto;";
    wrap.innerHTML = `
      <div style="font-size:13px;font-weight:500;margin-bottom:1rem;">📊 Indicadores Plan de Desarrollo — Top ${top.length}</div>
      <svg viewBox="0 0 ${W} ${tH}" width="100%" style="max-width:${W}px;display:block;">${bars}</svg>`;

    document.getElementById("timelineWrap")?.after(wrap);
  }
};
