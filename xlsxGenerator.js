const ExcelJS = require('exceljs');

// ─── Colores corporativos hiumanlab ───────────────────────────────────────────
const C = {
  purple:     '8747ED',
  orange:     'F5A623',
  dark:       '1A1A2E',
  white:      'FFFFFFFF',
  lightPurple:'EEE8F8',
  gray:       'F5F5F5',
  border:     'E5E7EB',
};

// ─── Helper: aplica estilo de encabezado de tabla ─────────────────────────────
function headerStyle(cell, text) {
  cell.value = text;
  cell.font  = { name: 'Arial', bold: true, color: { argb: C.white }, size: 11 };
  cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.purple } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  cell.border = {
    top:    { style: 'thin', color: { argb: C.purple } },
    bottom: { style: 'thin', color: { argb: C.purple } },
    left:   { style: 'thin', color: { argb: C.purple } },
    right:  { style: 'thin', color: { argb: C.purple } },
  };
}

// ─── Helper: celda de datos normal ───────────────────────────────────────────
function dataStyle(cell, value, opts = {}) {
  cell.value = value ?? '';
  cell.font  = { name: 'Arial', size: 10, bold: opts.bold || false,
                 color: { argb: opts.color || C.dark } };
  cell.alignment = { vertical: 'middle', horizontal: opts.align || 'left', wrapText: true };
  if (opts.fill) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
  }
  cell.border = {
    top:    { style: 'hair', color: { argb: C.border } },
    bottom: { style: 'hair', color: { argb: C.border } },
    left:   { style: 'hair', color: { argb: C.border } },
    right:  { style: 'hair', color: { argb: C.border } },
  };
}

// ─── Helper: fila de título de sección ───────────────────────────────────────
function sectionTitle(sheet, rowNum, text, colSpan) {
  const row = sheet.getRow(rowNum);
  row.height = 28;
  const cell = row.getCell(1);
  cell.value = text;
  cell.font  = { name: 'Arial', bold: true, size: 13, color: { argb: C.purple } };
  cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F0FF' } };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.mergeCells(rowNum, 1, rowNum, colSpan);
}

// ─── Helper: agrega bloque de logo / portada en hoja ────────────────────────
function addLogoBlock(sheet, clientName, projectName, fecha) {
  // Fila 1: nombre empresa
  sheet.getRow(1).height = 36;
  const t1 = sheet.getCell('A1');
  t1.value = '/ hiumanlab';
  t1.font  = { name: 'Arial Black', size: 20, bold: true, color: { argb: C.purple } };
  t1.alignment = { vertical: 'middle' };

  // Fila 2: subtítulo
  sheet.getRow(2).height = 18;
  const t2 = sheet.getCell('A2');
  t2.value = 'Creating Technology Together';
  t2.font  = { name: 'Arial', size: 9, color: { argb: '888888' } };

  // Fila 3: vacía
  sheet.getRow(3).height = 10;

  // Fila 4: datos del proyecto
  sheet.getRow(4).height = 22;
  const t4 = sheet.getCell('A4');
  t4.value = `Proyecto: ${projectName}   |   Cliente: ${clientName}   |   Fecha: ${fecha}`;
  t4.font  = { name: 'Arial', size: 10, italic: true, color: { argb: C.dark } };

  // Fila 5: separador
  sheet.getRow(5).height = 6;
  const sep = sheet.getCell('A5');
  sep.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.purple } };

  return 7; // primera fila disponible para contenido
}

// ─────────────────────────────────────────────────────────────────────────────
//  PESTAÑA 1 — Propuesta Económica
// ─────────────────────────────────────────────────────────────────────────────
function buildEconomicSheet(wb, data) {
  const sheet = wb.addWorksheet('Propuesta Económica', {
    properties: { tabColor: { argb: C.purple } },
    pageSetup:  { paperSize: 9, orientation: 'portrait', fitToPage: true },
  });

  sheet.columns = [
    { key: 'concepto',   width: 40 },
    { key: 'dias',       width: 12 },
    { key: 'horas',      width: 12 },
    { key: 'inversion',  width: 22 },
  ];

  let row = addLogoBlock(sheet, data.tituloCliente, data.tituloProyecto, data.fechaProyecto);

  sectionTitle(sheet, row, 'PROPUESTA ECONÓMICA', 4);
  row += 2;

  // Encabezados
  const hRow = sheet.getRow(row);
  hRow.height = 26;
  ['Concepto / Fase', 'Días', 'Horas', 'Inversión (MXN)*'].forEach((h, i) => {
    headerStyle(hRow.getCell(i + 1), h);
  });
  row++;

  // Filas de datos
  const items = Array.isArray(data.propuestaEconomica) ? data.propuestaEconomica : [];
  items.forEach((item, idx) => {
    const dRow = sheet.getRow(row);
    dRow.height = 22;
    const fill = idx % 2 === 0 ? C.gray : 'FFFFFFFF';
    dataStyle(dRow.getCell(1), item.name || item.concepto || '', { fill });
    dataStyle(dRow.getCell(2), item.days || '', { fill, align: 'center' });
    dataStyle(dRow.getCell(3), item.hours || '', { fill, align: 'center' });

    const inv = Number(item.investment || item.inversion || 0);
    const invCell = dRow.getCell(4);
    dataStyle(invCell, inv, { fill, align: 'right' });
    invCell.numFmt = '"$"#,##0.00';
    row++;
  });

  // Fila TOTAL
  const totalRow = sheet.getRow(row);
  totalRow.height = 28;
  const tc1 = totalRow.getCell(1);
  tc1.value = 'TOTAL';
  tc1.font  = { name: 'Arial', bold: true, size: 12, color: { argb: C.white } };
  tc1.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.dark } };
  tc1.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.mergeCells(row, 1, row, 3);

  const tc4 = totalRow.getCell(4);
  tc4.value = Number(data.precioTotal || 0);
  tc4.font  = { name: 'Arial', bold: true, size: 13, color: { argb: C.white } };
  tc4.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.orange } };
  tc4.alignment = { vertical: 'middle', horizontal: 'right' };
  tc4.numFmt = '"$"#,##0.00';
  row += 2;

  // Nota IVA
  const noteCell = sheet.getCell(`A${row}`);
  noteCell.value = '* Precios más IVA. Vigencia de la propuesta: 15 días naturales.';
  noteCell.font  = { name: 'Arial', italic: true, size: 9, color: { argb: '888888' } };
}

// ─────────────────────────────────────────────────────────────────────────────
//  PESTAÑA 2 — Cronograma
// ─────────────────────────────────────────────────────────────────────────────
function buildScheduleSheet(wb, data) {
  const sheet = wb.addWorksheet('Cronograma', {
    properties: { tabColor: { argb: C.orange } },
    pageSetup:  { paperSize: 9, orientation: 'landscape', fitToPage: true },
  });

  const weeks = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];

  sheet.columns = [
    { key: 'fase',        width: 28 },
    { key: 'estimacion',  width: 18 },
    ...weeks.map(w => ({ key: w, width: 8 })),
  ];

  let row = addLogoBlock(sheet, data.tituloCliente, data.tituloProyecto, data.fechaProyecto);

  sectionTitle(sheet, row, 'CRONOGRAMA DE ENTREGA', 9);
  row += 2;

  // Encabezados
  const hRow = sheet.getRow(row);
  hRow.height = 26;
  ['Fase', 'Estimación', ...weeks].forEach((h, i) => {
    headerStyle(hRow.getCell(i + 1), h);
    if (i >= 2) hRow.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle' };
  });
  row++;

  // Filas de fases
  const tiempos = Array.isArray(data.tiempos) ? data.tiempos : [];
  tiempos.forEach((fase, idx) => {
    const dRow = sheet.getRow(row);
    dRow.height = 24;
    const fill = idx % 2 === 0 ? C.gray : 'FFFFFFFF';

    dataStyle(dRow.getCell(1), fase.name || fase.nombre || '', { fill, bold: true });
    dataStyle(dRow.getCell(2), `${fase.days || 0} días / ${fase.hours || fase.hrs || 0} hrs`, { fill });

    const activeWeeks = Array.isArray(fase.weeks) ? fase.weeks : [];
    weeks.forEach((_, wi) => {
      const cell = dRow.getCell(wi + 3);
      const isActive = activeWeeks[wi] === true || activeWeeks[wi] === 1;
      cell.value = isActive ? '✓' : '';
      cell.font  = { name: 'Arial', bold: true, size: 12,
                     color: { argb: isActive ? C.white : C.border } };
      cell.fill  = { type: 'pattern', pattern: 'solid',
                     fgColor: { argb: isActive ? C.purple : fill } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top:    { style: 'hair', color: { argb: C.border } },
        bottom: { style: 'hair', color: { argb: C.border } },
        left:   { style: 'hair', color: { argb: C.border } },
        right:  { style: 'hair', color: { argb: C.border } },
      };
    });
    row++;
  });

  // Nota
  row += 1;
  const noteCell = sheet.getCell(`A${row}`);
  noteCell.value = '* Los tiempos pueden ajustarse en función de la entrega oportuna de insumos por parte del cliente.';
  noteCell.font  = { name: 'Arial', italic: true, size: 9, color: { argb: '888888' } };
}

// ─────────────────────────────────────────────────────────────────────────────
//  PESTAÑA 3 — Módulos y Actividades
// ─────────────────────────────────────────────────────────────────────────────
function buildModulesSheet(wb, data) {
  const sheet = wb.addWorksheet('Módulos y Actividades', {
    properties: { tabColor: { argb: C.dark } },
    pageSetup:  { paperSize: 9, orientation: 'portrait', fitToPage: true },
  });

  sheet.columns = [
    { key: 'modulo',      width: 26 },
    { key: 'objetivo',    width: 36 },
    { key: 'actividades', width: 50 },
  ];

  let row = addLogoBlock(sheet, data.tituloCliente, data.tituloProyecto, data.fechaProyecto);

  sectionTitle(sheet, row, 'MÓDULOS Y ACTIVIDADES FUNCIONALES', 3);
  row += 2;

  // Encabezados
  const hRow = sheet.getRow(row);
  hRow.height = 26;
  ['Módulo', 'Objetivo', 'Actividades'].forEach((h, i) => {
    headerStyle(hRow.getCell(i + 1), h);
  });
  row++;

  // Filas de módulos
  const modulos = Array.isArray(data.modulos) ? data.modulos : [];
  modulos.forEach((mod, idx) => {
    const dRow = sheet.getRow(row);
    dRow.height = 60;
    const fill = idx % 2 === 0 ? C.lightPurple : 'FFFFFFFF';

    dataStyle(dRow.getCell(1), mod.title || mod.titulo || '', { fill, bold: true, color: C.dark });
    dataStyle(dRow.getCell(2), mod.objective || mod.objetivo || '', { fill });

    const acts = mod.activities || mod.actividades || '';
    dataStyle(dRow.getCell(3), Array.isArray(acts) ? acts.join('\n') : acts, { fill });
    row++;
  });

  // Sección criterios de aceptación
  row += 1;
  sectionTitle(sheet, row, 'CRITERIOS DE ACEPTACIÓN', 3);
  row += 2;

  const hRow2 = sheet.getRow(row);
  hRow2.height = 26;
  ['Módulo / Criterio', 'Reglas de Negocio', 'Criterio de Aceptación'].forEach((h, i) => {
    headerStyle(hRow2.getCell(i + 1), h);
  });
  row++;

  const criterios = Array.isArray(data.criteriosAceptacionModulos) ? data.criteriosAceptacionModulos : [];
  criterios.forEach((crit, idx) => {
    const dRow = sheet.getRow(row);
    dRow.height = 50;
    const fill = idx % 2 === 0 ? C.gray : 'FFFFFFFF';
    dataStyle(dRow.getCell(1), crit.title || crit.titulo || '', { fill, bold: true });
    dataStyle(dRow.getCell(2), crit.businessRules || crit.reglas || '', { fill });
    dataStyle(dRow.getCell(3), crit.acceptance || crit.aceptacion || '', { fill });
    row++;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
async function generateXlsxBuffer(data) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'hiumanlab / iucorporation';
  wb.created  = new Date();
  wb.modified = new Date();

  buildEconomicSheet(wb, data);
  buildScheduleSheet(wb, data);
  buildModulesSheet(wb, data);

  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}

module.exports = { generateXlsxBuffer };
