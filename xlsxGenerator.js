const ExcelJS = require('exceljs');

// ─── Colores corporativos hiumanlab ───────────────────────────────────────────
const C = {
  purple:     'FF8747ED',
  orange:     'FFF5A623',
  dark:       'FF1A1A2E',
  white:      'FFFFFFFF',
  lightPurple:'FFEEE8F8',
  gray:       'FFF5F5F5',
  border:     'FFE5E7EB',
};

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

function sectionTitle(sheet, rowNum, text, colSpan) {
  const row  = sheet.getRow(rowNum);
  row.height = 28;
  const cell = row.getCell(1);
  cell.value = text;
  cell.font  = { name: 'Arial', bold: true, size: 13, color: { argb: C.purple } };
  cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F0FF' } };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  if (colSpan > 1) sheet.mergeCells(rowNum, 1, rowNum, colSpan);
}

function addLogoBlock(sheet, clientName, projectName, fecha) {
  sheet.getRow(1).height = 36;
  const t1 = sheet.getCell('A1');
  t1.value = '/ hiumanlab';
  t1.font  = { name: 'Arial Black', size: 20, bold: true, color: { argb: C.purple } };
  t1.alignment = { vertical: 'middle' };

  sheet.getRow(2).height = 18;
  sheet.getCell('A2').value = 'Creating Technology Together';
  sheet.getCell('A2').font  = { name: 'Arial', size: 9, color: { argb: 'FF888888' } };

  sheet.getRow(3).height = 10;

  sheet.getRow(4).height = 22;
  const t4 = sheet.getCell('A4');
  t4.value = `Proyecto: ${projectName}   |   Cliente: ${clientName}   |   Fecha: ${fecha}`;
  t4.font  = { name: 'Arial', size: 10, italic: true, color: { argb: C.dark } };

  sheet.getRow(5).height = 6;
  sheet.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.purple } };

  return 7;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PESTAÑA 1 — Propuesta Económica
//  data.precios.{ levantamiento, maqueta, desarrollo, qa, total }
//  data.tiempos.{ levantamiento, maqueta, desarrollo, qa }.{ dias, hrs }
// ─────────────────────────────────────────────────────────────────────────────
function buildEconomicSheet(wb, data) {
  const sheet = wb.addWorksheet('Propuesta Económica', {
    properties: { tabColor: { argb: C.purple } },
    pageSetup:  { paperSize: 9, orientation: 'portrait', fitToPage: true },
  });

  sheet.columns = [
    { key: 'concepto',  width: 40 },
    { key: 'dias',      width: 12 },
    { key: 'horas',     width: 12 },
    { key: 'inversion', width: 22 },
  ];

  let row = addLogoBlock(sheet, data.tituloCliente, data.tituloProyecto, data.fechaProyecto);

  sectionTitle(sheet, row, 'PROPUESTA ECONÓMICA', 4);
  row += 2;

  const hRow = sheet.getRow(row);
  hRow.height = 26;
  ['Concepto / Fase', 'Días', 'Horas', 'Inversión (MXN)*'].forEach((h, i) => {
    headerStyle(hRow.getCell(i + 1), h);
  });
  row++;

  const fases = [
    { name: 'Levantamiento de Requerimientos', key: 'levantamiento' },
    { name: 'Maquetación / UX·UI',             key: 'maqueta'       },
    { name: 'Desarrollo',                       key: 'desarrollo'    },
    { name: 'QA y Pruebas',                     key: 'qa'            },
  ];

  fases.forEach((fase, idx) => {
    const dRow  = sheet.getRow(row);
    dRow.height = 22;
    const fill  = idx % 2 === 0 ? C.gray : C.white;
    const t     = data.tiempos?.[fase.key] || {};
    const precio = Number(data.precios?.[fase.key] || 0);

    dataStyle(dRow.getCell(1), fase.name,      { fill });
    dataStyle(dRow.getCell(2), t.dias || 0,    { fill, align: 'center' });
    dataStyle(dRow.getCell(3), t.hrs  || 0,    { fill, align: 'center' });

    const invCell = dRow.getCell(4);
    invCell.value  = precio;
    invCell.numFmt = '"$"#,##0.00';
    invCell.font   = { name: 'Arial', size: 10, color: { argb: C.dark } };
    invCell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    invCell.alignment = { horizontal: 'right', vertical: 'middle' };
    invCell.border = {
      top: { style: 'hair', color: { argb: C.border } },
      bottom: { style: 'hair', color: { argb: C.border } },
      left: { style: 'hair', color: { argb: C.border } },
      right: { style: 'hair', color: { argb: C.border } },
    };
    row++;
  });

  // Fila TOTAL
  const totalRow = sheet.getRow(row);
  totalRow.height = 30;
  sheet.mergeCells(row, 1, row, 3);

  const tc1 = totalRow.getCell(1);
  tc1.value = 'TOTAL';
  tc1.font  = { name: 'Arial', bold: true, size: 13, color: { argb: C.white } };
  tc1.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.dark } };
  tc1.alignment = { vertical: 'middle', horizontal: 'left' };

  const tc4 = totalRow.getCell(4);
  tc4.value  = Number(data.precios?.total || 0);
  tc4.numFmt = '"$"#,##0.00';
  tc4.font   = { name: 'Arial', bold: true, size: 13, color: { argb: C.white } };
  tc4.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.orange } };
  tc4.alignment = { vertical: 'middle', horizontal: 'right' };
  row += 2;

  sheet.getCell(`A${row}`).value = '* Precios más IVA. Vigencia de la propuesta: 15 días naturales.';
  sheet.getCell(`A${row}`).font  = { name: 'Arial', italic: true, size: 9, color: { argb: 'FF888888' } };
}

// ─────────────────────────────────────────────────────────────────────────────
//  PESTAÑA 2 — Cronograma
//  data.tiempos.{ levantamiento, maqueta, desarrollo, qa }.{ dias, hrs, semanas }
//  semanas = array de índices base-0 activos, ej: [0, 1, 2] = S1, S2, S3
// ─────────────────────────────────────────────────────────────────────────────
function buildScheduleSheet(wb, data) {
  const sheet = wb.addWorksheet('Cronograma', {
    properties: { tabColor: { argb: C.orange } },
    pageSetup:  { paperSize: 9, orientation: 'landscape', fitToPage: true },
  });

  const weeks = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];

  sheet.columns = [
    { key: 'fase',       width: 30 },
    { key: 'estimacion', width: 20 },
    ...weeks.map(w => ({ key: w, width: 8 })),
  ];

  let row = addLogoBlock(sheet, data.tituloCliente, data.tituloProyecto, data.fechaProyecto);

  sectionTitle(sheet, row, 'CRONOGRAMA DE ENTREGA', 9);
  row += 2;

  const hRow = sheet.getRow(row);
  hRow.height = 26;
  ['Fase', 'Estimación', ...weeks].forEach((h, i) => {
    headerStyle(hRow.getCell(i + 1), h);
    if (i >= 2) hRow.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle' };
  });
  row++;

  const fases = [
    { name: 'Levantamiento de Requerimientos', key: 'levantamiento' },
    { name: 'Maquetación / UX·UI',             key: 'maqueta'       },
    { name: 'Desarrollo',                       key: 'desarrollo'    },
    { name: 'QA y Pruebas',                     key: 'qa'            },
  ];

  fases.forEach((fase, idx) => {
    const dRow        = sheet.getRow(row);
    dRow.height       = 26;
    const fill        = idx % 2 === 0 ? C.gray : C.white;
    const t           = data.tiempos?.[fase.key] || {};
    const activeWeeks = Array.isArray(t.semanas) ? t.semanas : [];

    dataStyle(dRow.getCell(1), fase.name, { fill, bold: true });
    dataStyle(dRow.getCell(2), `${t.dias || 0} días / ${t.hrs || 0} hrs`, { fill });

    weeks.forEach((_, wi) => {
      const cell = dRow.getCell(wi + 3);
      // semanas puede ser [0,1,2] (índices) o [true,false,...] (booleanos)
      const isActive = typeof activeWeeks[0] === 'boolean'
        ? activeWeeks[wi] === true
        : activeWeeks.includes(wi);

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

  row += 1;
  sheet.getCell(`A${row}`).value = '* Los tiempos pueden ajustarse en función de la entrega oportuna de insumos por parte del cliente.';
  sheet.getCell(`A${row}`).font  = { name: 'Arial', italic: true, size: 9, color: { argb: 'FF888888' } };
}

// ─────────────────────────────────────────────────────────────────────────────
//  PESTAÑA 3 — Módulos y Actividades
//  data.modulos[].{ titulo, objetivo, actividades[] }
//  data.criteriosPorModulo[].{ titulo, reglasNegocio, criteriosAceptacion }
// ─────────────────────────────────────────────────────────────────────────────
function buildModulesSheet(wb, data) {
  const sheet = wb.addWorksheet('Módulos y Actividades', {
    properties: { tabColor: { argb: C.dark } },
    pageSetup:  { paperSize: 9, orientation: 'portrait', fitToPage: true },
  });

  sheet.columns = [
    { key: 'modulo',      width: 28 },
    { key: 'objetivo',    width: 36 },
    { key: 'actividades', width: 52 },
  ];

  let row = addLogoBlock(sheet, data.tituloCliente, data.tituloProyecto, data.fechaProyecto);

  sectionTitle(sheet, row, 'MÓDULOS Y ACTIVIDADES FUNCIONALES', 3);
  row += 2;

  const hRow = sheet.getRow(row);
  hRow.height = 26;
  ['Módulo', 'Objetivo', 'Actividades'].forEach((h, i) => headerStyle(hRow.getCell(i + 1), h));
  row++;

  const modulos = Array.isArray(data.modulos) ? data.modulos : [];
  modulos.forEach((mod, idx) => {
    const dRow  = sheet.getRow(row);
    dRow.height = 60;
    const fill  = idx % 2 === 0 ? C.lightPurple : C.white;
    const acts  = Array.isArray(mod.actividades)
      ? mod.actividades.map(a => `• ${a}`).join('\n')
      : (mod.actividades || '');

    dataStyle(dRow.getCell(1), mod.titulo   || '', { fill, bold: true });
    dataStyle(dRow.getCell(2), mod.objetivo || '', { fill });
    dataStyle(dRow.getCell(3), acts,                { fill });
    row++;
  });

  // Criterios de aceptación
  row += 1;
  sectionTitle(sheet, row, 'CRITERIOS DE ACEPTACIÓN', 3);
  row += 2;

  const hRow2 = sheet.getRow(row);
  hRow2.height = 26;
  ['Módulo / Criterio', 'Reglas de Negocio', 'Criterio de Aceptación'].forEach((h, i) => {
    headerStyle(hRow2.getCell(i + 1), h);
  });
  row++;

  const criterios = Array.isArray(data.criteriosPorModulo) ? data.criteriosPorModulo : [];
  criterios.forEach((crit, idx) => {
    const dRow  = sheet.getRow(row);
    dRow.height = 50;
    const fill  = idx % 2 === 0 ? C.gray : C.white;
    dataStyle(dRow.getCell(1), crit.titulo              || '', { fill, bold: true });
    dataStyle(dRow.getCell(2), crit.reglasNegocio       || '', { fill });
    dataStyle(dRow.getCell(3), crit.criteriosAceptacion || '', { fill });
    row++;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
async function generateXlsxBuffer(data) {
  const wb    = new ExcelJS.Workbook();
  wb.creator  = 'hiumanlab / iucorporation';
  wb.created  = new Date();
  wb.modified = new Date();

  buildEconomicSheet(wb, data);
  buildScheduleSheet(wb, data);
  buildModulesSheet(wb, data);

  return await wb.xlsx.writeBuffer();
}

module.exports = { generateXlsxBuffer };
