// ══════════════════════════════════════════════════════
// MAPA · v2.1
// ══════════════════════════════════════════════════════
const MAPA = {
  _map:         null,
  _capa:        null,
  _capas:       {},
  _marcadores:  [],
  _config:      null,
  _datos:       null,
  _filtroIcono: null,

  init(datos, config) {
    this._datos  = datos;
    this._config = config;

    if (this._map) { this._map.remove(); this._marcadores = []; }

    this._map = L.map("mapa", {
      center:      APP_CONFIG.MAPA_CENTER,
      zoom:        APP_CONFIG.MAPA_ZOOM,
      zoomControl: true
    });

    this._capas.osm = L.tileLayer(APP_CONFIG.CAPAS_MAPA.osm, {
      attribution: APP_CONFIG.ATRIBUCIONES.osm, maxZoom: 19
    }).addTo(this._map);
    this._capa = "osm";

    this._renderVeredas();
    this._renderMarcadores();
    this._renderLeyenda();
    this._renderFiltros();
    this._initCapas();
    this._initEventos();
    this._actualizarConteo();
  },

  _renderVeredas() {
    const veredas = this._config?.veredas || {};
    const benef   = this._datos?.beneficiarios || [];
    const cnt = {};
    benef.forEach(b => {
      const p = parseInt(b.personas_representadas) || 1;
      cnt[b.vereda] = (cnt[b.vereda] || 0) + p;
    });

    Object.entries(veredas).forEach(([n, v]) => {
      const c = cnt[n] || 0;
      if (!c) return;
      const radio = Math.max(150, Math.min(500, c * 40));
      L.circle([v.lat, v.lng], {
        radius: radio, fillColor: v.color,
        fillOpacity: .12, color: v.color, weight: 1.5, dashArray: "5 4"
      }).addTo(this._map)
        .bindTooltip(`<strong>${n}</strong><br>${c} persona${c !== 1 ? "s" : ""}`, {
          permanent: false, direction: "top", className: ""
        });
    });
  },

  _renderMarcadores() {
    const benef  = this._datos?.beneficiarios || [];
    const prog   = this._datos?.programas || [];
    const iconos = this._config?.iconos || {};
    const veredas= this._config?.veredas || {};

    const mi = {};
    prog.forEach(p => { mi[p.codigo] = p.tipo_icono || "general"; });

    this._marcadores.forEach(m => this._map.removeLayer(m));
    this._marcadores = [];

    let visibles = 0;
    benef.forEach(b => {
      if (!b.lat || !b.lng || (+b.lat === 0 && +b.lng === 0)) return;
      const ti  = mi[b.programa_codigo] || "general";
      if (this._filtroIcono && ti !== this._filtroIcono) return;

      const ico   = iconos[ti] || { emoji: "📋" };
      const vc    = (veredas[b.vereda] || {}).color || "#1D9E75";
      const aprox = b.es_aproximado === "SI";

      const icon = L.divIcon({
        html: `<div class="marcador-beneficiario" style="background:${vc};${aprox ? "opacity:.7;" : ""}">
                 <div class="marcador-inner">${ico.emoji}</div>
               </div>`,
        iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32], className: ""
      });

      const m = L.marker([+b.lat, +b.lng], { icon }).addTo(this._map);
      m.on("click", () => this._popup(b, ico, vc));
      this._marcadores.push(m);
      visibles++;
    });

    this._actualizarConteo(visibles);
  },

  _popup(b, ico, color) {
    const el    = document.getElementById("beneficiarioPopup");
    const aprox = b.es_aproximado === "SI";
    const label = (this._config?.iconos?.[b.tipo_icono || "general"] || { label: "Programa" }).label;

    document.getElementById("popupContenido").innerHTML = `
      <div style="background:${color};padding:14px 16px 10px;">
        <div style="font-size:26px;margin-bottom:4px;line-height:1;">${ico.emoji}</div>
        <div style="font-size:14px;font-weight:500;color:white;line-height:1.3;">${b.nombre || "Sin nombre"}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.75);margin-top:2px;">📍 ${b.vereda || "—"}</div>
      </div>
      <div style="padding:12px 16px;">
        <div style="font-size:10px;color:#9B9A96;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">${label}</div>
        ${parseInt(b.personas_representadas) > 1 ? `<div style="font-size:12px;font-weight:600;color:#163040;margin-bottom:6px;">👥 ${parseInt(b.personas_representadas)} personas representadas</div>` : ""}
        ${b.tipo_beneficio ? `<div style="font-size:12px;margin-bottom:4px;"><strong>Beneficio:</strong> ${b.tipo_beneficio}</div>` : ""}
        ${b.detalle        ? `<div style="font-size:12px;color:#5F5E5A;margin-bottom:6px;">${b.detalle}</div>` : ""}
        <div style="font-size:11px;color:#9B9A96;margin-bottom:6px;">📅 Q${b.trimestre} ${b.anio}</div>
        <div style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:500;padding:3px 8px;border-radius:4px;
             background:${aprox ? "#FAEEDA" : "#E1F5EE"};color:${aprox ? "#BA7517" : "#085041"};">
          📍 ${aprox ? "Ubicación aproximada (vereda)" : "Ubicación exacta"}
        </div>
      </div>`;
    el.classList.remove("hidden");
  },

  _renderLeyenda() {
    const v   = this._config?.veredas || {};
    const cnt = {};
    (this._datos?.beneficiarios || []).forEach(x => {
      const p = parseInt(x.personas_representadas) || 1;
      cnt[x.vereda] = (cnt[x.vereda] || 0) + p;
    });

    const c = document.getElementById("leyendaItems");
    if (!c) return;

    const todas = Object.entries(v).sort((a, b) => (cnt[b[0]] || 0) - (cnt[a[0]] || 0));
    if (!todas.length) {
      c.innerHTML = `<div style="font-size:11px;color:#9B9A96;font-style:italic;padding:4px 0;">Sin datos aún</div>`;
      return;
    }

    c.innerHTML = todas
      .map(([n, i]) => {
        const num = cnt[n] || 0;
        return `<div class="leyenda-item" style="${!num ? "opacity:.45;" : ""}">
           <div class="leyenda-dot" style="background:${i.color};"></div>
           <span style="flex:1;">${n}</span>
           <span style="color:#9B9A96;font-size:10px;">${num ? num + " pers." : "—"}</span>
         </div>`;
      }).join("");
  },

  _renderFiltros() {
    const prog   = this._datos?.programas || [];
    const iconos = this._config?.iconos || {};
    const tipos  = [...new Set(prog.map(p => p.tipo_icono).filter(Boolean))];

    const c = document.getElementById("filtroIconos");
    if (!c) return;

    const total = (this._datos?.beneficiarios || []).length;
    c.innerHTML = `<div class="icono-filtro active" data-tipo="todos" onclick="MAPA.filtrar('todos',this)">
                     🗺️ Todos <span style="color:#9B9A96;font-size:10px;">(${total})</span>
                   </div>`;

    tipos.forEach(t => {
      const ic  = iconos[t] || { emoji: "📋", label: t };
      const cnt = (this._datos?.beneficiarios || []).filter(b => {
        const p = (this._datos?.programas || []).find(x => x.codigo === b.programa_codigo);
        return p?.tipo_icono === t;
      }).length;
      c.innerHTML += `<div class="icono-filtro" data-tipo="${t}" onclick="MAPA.filtrar('${t}',this)">
                        ${ic.emoji} ${ic.label} <span style="color:#9B9A96;font-size:10px;">(${cnt})</span>
                      </div>`;
    });
  },

  _actualizarConteo(n) {
    const total = this._datos?.beneficiarios?.length || 0;
    const vis   = n !== undefined ? n : total;
    // Actualizar el tooltip del panel
    const panel = document.querySelector(".programas-panel .panel-title");
    if (panel) panel.textContent = vis === total
      ? `${total} beneficiarios`
      : `${vis} de ${total} visibles`;
  },

  filtrar(t, el) {
    document.querySelectorAll("#filtroIconos .icono-filtro").forEach(e => e.classList.remove("active"));
    el.classList.add("active");
    this._filtroIcono = t === "todos" ? null : t;
    this._renderMarcadores();
  },

  _initCapas() {
    document.querySelectorAll(".capa-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const c = btn.dataset.capa;
        if (c === this._capa) return;
        if (this._capas[this._capa]) this._map.removeLayer(this._capas[this._capa]);
        if (!this._capas[c]) {
          this._capas[c] = L.tileLayer(APP_CONFIG.CAPAS_MAPA[c], {
            attribution: APP_CONFIG.ATRIBUCIONES[c] || "", maxZoom: 19
          });
        }
        this._capas[c].addTo(this._map);
        this._capa = c;
        document.querySelectorAll(".capa-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  },

  _initEventos() {
    document.getElementById("popupClose")?.addEventListener("click", () =>
      document.getElementById("beneficiarioPopup").classList.add("hidden")
    );
    this._map.on("click", () =>
      document.getElementById("beneficiarioPopup").classList.add("hidden")
    );
  }
};

// ══════════════════════════════════════════════════════
// MAPA EDITOR (panel admin)
// ══════════════════════════════════════════════════════
const MAPA_EDITOR = {
  _map:    null,
  _activo: null,

  init(datos, config) {
    if (this._map) return;
    this._map = L.map("mapaEditor", {
      center: APP_CONFIG.MAPA_CENTER,
      zoom:   APP_CONFIG.MAPA_ZOOM
    });
    L.tileLayer(APP_CONFIG.CAPAS_MAPA.osm, {
      attribution: APP_CONFIG.ATRIBUCIONES.osm, maxZoom: 19
    }).addTo(this._map);
    this._render(datos, config);
  },

  _render(datos, config) {
    const benef  = datos?.beneficiarios || [];
    const iconos = config?.iconos || {};
    const prog   = datos?.programas || [];
    const mi = {};
    prog.forEach(p => { mi[p.codigo] = p.tipo_icono || "general"; });

    benef.forEach(b => {
      if (!b.lat || !b.lng) return;
      const ti    = mi[b.programa_codigo] || "general";
      const ic    = iconos[ti] || { emoji: "📋" };
      const aprox = b.es_aproximado === "SI";

      const icon = L.divIcon({
        html: `<div style="background:${aprox ? "#BA7517" : "#1D9E75"};
                    width:28px;height:28px;border-radius:50% 50% 50% 0;
                    transform:rotate(-45deg);border:2px solid white;
                    display:flex;align-items:center;justify-content:center;
                    box-shadow:0 2px 6px rgba(0,0,0,.3);">
                 <span style="transform:rotate(45deg);font-size:13px;">${ic.emoji}</span>
               </div>`,
        iconSize: [28, 28], iconAnchor: [14, 28], className: ""
      });

      const m = L.marker([+b.lat, +b.lng], { icon, draggable: true }).addTo(this._map);
      m.on("click",   () => this._seleccionar(b, m));
      m.on("dragend", e  => { const p = e.target.getLatLng(); this._guardar(b.id, p.lat, p.lng); });
    });
  },

  _seleccionar(b, m) {
    document.getElementById("editorSidebar").innerHTML = `
      <div style="font-size:13px;font-weight:500;margin-bottom:6px;">${b.nombre || "Sin nombre"}</div>
      <div style="font-size:11px;color:#5F5E5A;margin-bottom:4px;">📍 ${b.vereda || "—"}</div>
      <div style="font-size:11px;margin-bottom:12px;">
        <span style="background:${b.es_aproximado === "SI" ? "#FAEEDA" : "#E1F5EE"};
              color:${b.es_aproximado === "SI" ? "#BA7517" : "#085041"};
              padding:2px 6px;border-radius:4px;font-size:10px;">
          ${b.es_aproximado === "SI" ? "Aprox." : "Exacta"}
        </span>
      </div>
      <p style="font-size:11px;color:#5F5E5A;line-height:1.5;margin-bottom:12px;">
        Arrastra el marcador para ajustar la posición y luego confirma.
      </p>
      <button class="btn-primary" style="width:100%;font-size:12px;"
              onclick="MAPA_EDITOR._guardar('${b.id}',null,null)">
        💾 Confirmar posición
      </button>`;
    this._activo = { id: b.id, m };
    this._map.setView([+b.lat, +b.lng], 16);
  },

  async _guardar(id, lat, lng) {
    if (this._activo?.m && lat === null) {
      const p = this._activo.m.getLatLng();
      lat = p.lat; lng = p.lng;
    }
    const r = await API.actualizarCoordenada(id, lat, lng);
    APP.toast(r.ok ? "✅ Ubicación guardada" : "❌ " + r.error, r.ok ? "ok" : "error");
  }
};
