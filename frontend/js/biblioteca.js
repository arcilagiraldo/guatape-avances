// ══════════════════════════════════════════════════════
// BIBLIOTECA · v2.1
// ══════════════════════════════════════════════════════
const BIBLIOTECA = {
  render(datos, config) {
    const arch = datos?.biblioteca || [];
    const sM   = {};
    (config?.secretarias || []).forEach(s => { sM[s.id] = s; });

    const grid = document.getElementById("bibliotecaGrid");
    if (!grid) return;

    if (!arch.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">📁</div>
          <div class="empty-state-title">Biblioteca vacía</div>
          <div class="empty-state-desc">
            Las secretarías deben subir sus informes trimestrales desde el panel administrativo.
            Los documentos PDF y Excel quedarán disponibles aquí para descarga pública.
          </div>
        </div>`;
      return;
    }

    // Agrupar por secretaría + año + trimestre
    const grupos = {};
    arch.forEach(a => {
      const k = `${a.secretaria}::${a.anio}-Q${a.trimestre}`;
      if (!grupos[k]) grupos[k] = { secretaria: a.secretaria, anio: a.anio, trimestre: a.trimestre, docs: [] };
      grupos[k].docs.push(a);
    });

    // Ordenar: más reciente primero
    const ordenados = Object.values(grupos).sort((a, b) => {
      const ka = `${b.anio}-${String(b.trimestre).padStart(2,"0")}`;
      const kb = `${a.anio}-${String(a.trimestre).padStart(2,"0")}`;
      return ka.localeCompare(kb);
    });

    grid.innerHTML = ordenados.map(gr => {
      const sec = sM[gr.secretaria] || { nombre: gr.secretaria, color: "#9B9A96", icono: "📋" };
      return `
        <div style="background:#fff;border:.5px solid rgba(0,0,0,.08);border-radius:12px;overflow:hidden;transition:box-shadow .2s;"
             onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'"
             onmouseout="this.style.boxShadow='none'">
          <div style="background:${sec.color};padding:12px 14px;display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">${sec.icono}</span>
            <div>
              <div style="font-size:12px;font-weight:500;color:white;">${sec.nombre}</div>
              <div style="font-size:10px;color:rgba(255,255,255,.7);">Q${gr.trimestre} · ${gr.anio}</div>
            </div>
            <div style="margin-left:auto;background:rgba(255,255,255,.15);color:white;
                        font-size:10px;padding:3px 8px;border-radius:20px;">
              ${gr.docs.length} archivo${gr.docs.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div style="padding:10px 14px;">
            ${gr.docs.map(d => this._docItem(d)).join("")}
          </div>
        </div>`;
    }).join("");
  },

  _docItem(d) {
    const esPDF   = d.tipo === "informe_pdf";
    const icono   = esPDF ? "📄" : "📊";
    const nombre  = esPDF ? "Informe Ejecutivo PDF" : "Seguimiento PA/PD Excel";
    const tipo    = esPDF ? "PDF" : "Excel";
    const color   = esPDF ? "#A32D2D" : "#2D6A4F";
    const fecha   = API.fmtFecha(d.fecha_subida);

    return `
      <div style="padding:10px 0;border-bottom:.5px solid rgba(0,0,0,.06);display:flex;align-items:flex-start;gap:10px;">
        <div style="font-size:26px;line-height:1;">${icono}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:500;margin-bottom:2px;">${nombre}</div>
          <div style="font-size:10px;color:#9B9A96;margin-bottom:6px;">Subido: ${fecha}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <a href="${d.download_url}" target="_blank" rel="noopener"
               style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:500;
                      color:white;background:${color};text-decoration:none;
                      padding:4px 10px;border-radius:6px;">
              ⬇ Descargar ${tipo}
            </a>
            ${esPDF ? `
            <a href="${d.url}" target="_blank" rel="noopener"
               style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:500;
                      color:${color};border:.5px solid ${color};text-decoration:none;
                      padding:4px 10px;border-radius:6px;background:white;">
              👁 Ver
            </a>` : ""}
          </div>
        </div>
      </div>`;
  }
};
