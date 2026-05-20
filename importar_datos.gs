// ════════════════════════════════════════════════════════════════
// IMPORTAR DATOS INICIALES — ejecutar UNA sola vez, luego borrar
// ════════════════════════════════════════════════════════════════
function importarDatosIniciales() {
  Logger.log("📥 Descargando datos desde GitHub...");
  const url = "https://arcilagiraldo.github.io/guatape-avances/js/datos_iniciales.js";
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  let texto = resp.getContentText();

  // Extraer el JSON buscando el primer { y el último }
  const inicio = texto.indexOf("{");
  const fin    = texto.lastIndexOf("}");
  const data   = JSON.parse(texto.substring(inicio, fin + 1));
  Logger.log("✅ Datos descargados correctamente");

  const ssId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!ssId) { Logger.log("❌ No se encontró SPREADSHEET_ID. ¿Ya ejecutaste instalar()?"); return; }
  const ss = SpreadsheetApp.openById(ssId);

  _importarHoja(ss, "metas_pd",      data.metas_pd);
  _importarHoja(ss, "metas_pa",      data.metas_pa);
  _importarHoja(ss, "programas",     data.programas);
  _importarHoja(ss, "beneficiarios", data.beneficiarios);
  _importarHoja(ss, "contratos",     data.contratos);

  Logger.log("🎉 IMPORTACIÓN COMPLETADA — ya puedes borrar esta función");
}

function _importarHoja(ss, nombre, registros) {
  if (!registros || registros.length === 0) {
    Logger.log("⚠️  " + nombre + ": sin registros, se omite");
    return;
  }
  const hoja = ss.getSheetByName(nombre);
  if (!hoja) { Logger.log("❌ Hoja no encontrada: " + nombre); return; }

  // Leer encabezados de la fila 1
  const ultCol = Math.max(hoja.getLastColumn(), 1);
  const encabezados = hoja.getRange(1, 1, 1, ultCol).getValues()[0];

  // Construir filas en el orden de los encabezados
  const filas = registros.map(r =>
    encabezados.map(h => (r[h] !== undefined && r[h] !== null) ? r[h] : "")
  );

  // Escribir a partir de la fila 2 (la 1 es el encabezado)
  hoja.getRange(2, 1, filas.length, encabezados.length).setValues(filas);
  Logger.log("✅ " + nombre + ": " + filas.length + " registros importados");
}
