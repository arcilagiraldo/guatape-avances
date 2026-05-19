// ╔══════════════════════════════════════════════════════════════╗
// ║  OBSERVATORIO MUNICIPAL DE GESTIÓN PÚBLICA                  ║
// ║  ← ÚNICO ARCHIVO QUE DEBES EDITAR PARA CONFIGURAR LA APP ← ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Para adaptar esta app a otro municipio, edita solo este archivo.
// El resto del código se adapta automáticamente.

const APP_CONFIG = {

  // ┌─────────────────────────────────────────────────────────────┐
  // │  PASO 1 — URL del backend (Apps Script)                    │
  // │  Pega aquí la URL que te dio Apps Script al implementar    │
  // └─────────────────────────────────────────────────────────────┘
  API_URL: "https://script.google.com/macros/s/PEGA_AQUI_TU_URL/exec",

  // ┌─────────────────────────────────────────────────────────────┐
  // │  PASO 2 — Identidad del municipio                          │
  // └─────────────────────────────────────────────────────────────┘
  MUNICIPIO:    "Guatapé",
  DEPARTAMENTO: "Antioquia",
  GOBIERNO:     "Juntos Construimos Guatapé",
  PERIODO:      "2024–2027",
  NIT:          "890 983 830 - 3",

  // Logo oficial (URL pública de la imagen del escudo/logo)
  // Déjalo vacío "" para mostrar las iniciales en su lugar
  LOGO_URL: "",

  // ┌─────────────────────────────────────────────────────────────┐
  // │  PASO 3 — Paleta de colores oficial del municipio          │
  // │  Guatapé 2024-2027 · Manual de Identidad Visual            │
  // │  Fuente: municipiodeguatape.gov.co                         │
  // └─────────────────────────────────────────────────────────────┘

  // Colores PRINCIPALES
  // ── Paleta EXACTA del Manual de Identidad Visual (R/G/B del manual) ──
  COLOR_AZUL:    "#89C4E2",  // R137 G196 B226 — azul claro PREDOMINANTE
  COLOR_AMARILLO:"#FBDC08",  // R251 G220 B8   — amarillo/dorado bandera
  COLOR_VERDE:   "#078838",  // R7   G136 B56   — verde bandera
  COLOR_MARINO:  "#17272D",  // R23  G39  B45   — azul oscuro bandera / navbar
  COLOR_GRIS:    "#606060",  // R96  G96  B96   — gris complementario

  // Alias CSS
  COLOR_PPAL:  "#17272D",   // --marino: navbar, encabezados
  COLOR_SEC:   "#89C4E2",   // --azul: botones, badges, acentos
  COLOR_ACENT: "#FBDC08",   // --amarillo: alertas, dots live
  COLOR_DARK:  "#17272D"    // mismo marino

  // ┌─────────────────────────────────────────────────────────────┐
  // │  PASO 4 — Centro del mapa                                  │
  // └─────────────────────────────────────────────────────────────┘
  MAPA_CENTER: [6.2321, -75.1567],  // Coordenadas del centro del municipio
  MAPA_ZOOM:   13,

  // ┌─────────────────────────────────────────────────────────────┐
  // │  Capas de mapa — no es necesario editar esto               │
  // └─────────────────────────────────────────────────────────────┘
  CAPAS_MAPA: {
    osm:       "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    topo:      "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    oscuro:    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  },
  ATRIBUCIONES: {
    osm:       '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    satellite: "© Esri",
    topo:      "© OpenTopoMap",
    oscuro:    "© CARTO"
  }
};

// ── Auto-configuración desde localStorage ─────────────────────
// Si el admin guardó la URL desde el asistente de instalación,
// tiene prioridad sobre el valor hardcodeado arriba.
(function() {
  const urlGuardada = localStorage.getItem("gt_api_url");
  if (urlGuardada && urlGuardada.startsWith("https://")) {
    APP_CONFIG.API_URL = urlGuardada;
  }
})();
