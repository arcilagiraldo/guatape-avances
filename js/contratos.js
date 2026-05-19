// ══════════════════════════════════════════════════════
// CONTRATOS · v2.1
// ══════════════════════════════════════════════════════
const CONTRATOS = {
  _todos:     [],
  _config:    null,
  _ordenCol:  "valor",
  _ordenAsc:  false,

  render(datos, config) {
    this._todos  = datos?.contratos || [];
    this._config = config;
    this._stats();
    this._tabla(this._todos);
    this._buscador();
  },

  _stats() {
    const t = this._todos;
    const v = t.reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
    const s = new Set(t.map(c => c.secretaria)).size;
    const max = t.reduce((m, c) => (parseFloat(c.valor) || 0) > (parseFloat(m.valor) || 0) ? c : m, {});

    document.getElementById("contratosStats").innerHTML = `
      <div class="stat-card">
        <div style="font-size:22px;margin-bottom:6px;">📋</div>
        <div class="num">${t.length}</div>
        <div class="lbl">Contratos</div>
      </div>
      <div class="stat-card">
        <div style="font-size:22px;margin-bottom:6px;">💰</div>
        <div class="num">${API.fmtPeso(v)}</div>
        <div class="lbl">Valor total</div>
      </div>
      <div class="stat-card">
        <div style="font-size:22px;margin-bottom:6px;">🏛️</div>
        <div class="num">${s}</div>
        <div class="lbl">Secretarías</div>
      </div>`;
  },

  _tabla(cs) {
    const sM = {};
    (this._config?.secretarias || []).forEach(s => { sM[s.id] = s; });
    const w = document.getElementById("tablaContratos");
    if (!w) return;

    if (!cs.length) {
      w.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">Sin contratos para mostrar</div>
          <div class="empty-state-desc">
            Prueba con otros filtros o espera a que las secretarías suban sus informes.
          </div>
        </div>`;
      return;
    }

    // Cabecera con ordenamiento
    const th = (col, lbl) => {
      const activo = this._ordenCol === col;
      const flecha = activo ? (this._ordenAsc ? " ↑" : " ↓") : "";
      return `<span style="cursor:pointer;user-select:none;${activo ? "color:#fff;" : "color:rgba(255,255,255,.7);"}"
                    onclick="CONTRATOS._ordenar('${col}')">${lbl}${flecha}</span>`;
    };

    // Exportar CSV
    const exportBtn = `<button onclick="CONTRATOS._exportarCSV()"
      style="margin-left:auto;background:rgba(255,255,255,.12);border:none;color:#fff;
             font-size:11px;padding:5px 10px;border-radius:6px;cursor:pointer;">
      ⬇ CSV</button>`;

    w.innerHTML = `
      <div class="tabla-contratos">
        <div class="tabla-head" style="display:grid;grid-template-columns:1.5fr 1fr 3fr 1fr .8fr;gap:8px;padding:10px 16px;align-items:center;">
          ${th("numero","N° Contrato")}
          ${th("secretaria","Secretaría")}
          ${th("objeto","Objeto")}
          ${th("valor","Valor")}
          ${th("trimestre","Período")}
          ${exportBtn}
        </div>
        ${cs.map(c => {
          const s = sM[c.secretaria] || { color: "#9B9A96", nombre: c.secretaria, icono: "📋" };
          return `
            <div class="tabla-fila">
              <span style="font-weight:500;font-family:monospace;font-size:11px;">${c.numero || "—"}</span>
              <span>
                <span class="sec-chip" style="background:${s.color}22;color:${s.color};">
                  ${s.icono} ${(s.nombre || "").split(" ").slice(-2).join(" ")}
                </span>
              </span>
              <span style="font-size:11.5px;line-height:1.4;" title="${c.objeto || ""}">${this._truncar(c.objeto || "—", 70)}</span>
              <span class="valor-contrato" title="${API.fmtPesoFull(c.valor)}">${API.fmtPeso(c.valor)}</span>
              <span style="font-size:11px;color:#9B9A96;">Q${c.trimestre} ${c.anio}</span>
            </div>`;
        }).join("")}
      </div>`;
  },

  _truncar(txt, max) {
    return txt.length > max ? txt.substring(0, max) + "…" : txt;
  },

  _ordenar(col) {
    if (this._ordenCol === col) this._ordenAsc = !this._ordenAsc;
    else { this._ordenCol = col; this._ordenAsc = false; }

    const q   = document.getElementById("buscadorContratos")?.value.toLowerCase() || "";
    const src = q ? this._todos.filter(c =>
      (c.numero||"").toLowerCase().includes(q) ||
      (c.objeto||"").toLowerCase().includes(q)  ||
      (c.secretaria||"").toLowerCase().includes(q) ||
      (c.contratista||"").toLowerCase().includes(q)
    ) : [...this._todos];

    src.sort((a, b) => {
      let va = a[this._ordenCol] || "";
      let vb = b[this._ordenCol] || "";
      if (this._ordenCol === "valor") { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0; }
      if (va < vb) return this._ordenAsc ? -1 :  1;
      if (va > vb) return this._ordenAsc ?  1 : -1;
      return 0;
    });
    this._tabla(src);
  },

  _buscador() {
    const inp = document.getElementById("buscadorContratos");
    if (!inp) return;
    inp.addEventListener("input", () => {
      const q = inp.value.toLowerCase();
      const filtrados = q
        ? this._todos.filter(c =>
            (c.numero     ||"").toLowerCase().includes(q) ||
            (c.objeto     ||"").toLowerCase().includes(q) ||
            (c.secretaria ||"").toLowerCase().includes(q) ||
            (c.contratista||"").toLowerCase().includes(q)
          )
        : this._todos;
      this._tabla(filtrados);
    });
  },

  _exportarCSV() {
    const cols = ["numero","secretaria","objeto","valor","contratista","anio","trimestre"];
    const hdr  = ["N° Contrato","Secretaría","Objeto","Valor ($)","Contratista","Año","Trimestre"];
    const rows = [hdr, ...this._todos.map(c => cols.map(k => `"${(c[k]||"").toString().replace(/"/g,'""')}"`))];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "contratos_guatape.csv"; a.click();
    URL.revokeObjectURL(url);
    APP.toast("✅ CSV descargado");
  }
};
