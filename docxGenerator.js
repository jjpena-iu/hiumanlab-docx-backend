const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageBreak, LevelFormat, ImageRun, Header, Footer,
  Tab, TabStopType, TabStopLeader
} = require('docx');
const { mermaidToPng } = require('./mermaidRenderer');

// ─── Paleta de colores suavizada ─────────────────────────────────────────────
const PURPLE      = "7B5EA7";   // antes: 8747ED → más suave/profesional
const PURPLE_DARK = "4A3570";   // para títulos principales
const ORANGE      = "E8980A";   // antes: F5A623 → más cálido/menos saturado
const DARK        = "1A1A2E";
const WHITE       = "FFFFFF";
const LIGHT_PURPLE = "EEE8F8";  // antes: EDE8FB → ligeramente más suave
const PURPLE_TABLE = "8B6BB5";  // cabeceras de tabla
const GRAY_TEXT   = "666666";

// ─── Helpers de texto ────────────────────────────────────────────────────────

const run = (text, opts = {}) =>
  new TextRun({ text: String(text ?? ''), font: "Arial", color: DARK, size: 20, ...opts });

const purpleRun  = (text, size = 24, bold = true) => run(text, { bold, color: PURPLE_DARK, size });
const orangeRun  = (text, size = 20, bold = true) => run(text, { bold, color: ORANGE, size });

const h1 = (text) => new Paragraph({
  children: [run(text.toUpperCase(), { bold: true, color: PURPLE_DARK, size: 32 })],
  spacing: { before: 240, after: 100 },   // reducido: antes 360/120
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PURPLE, space: 3 } }
});

const h2 = (text) => new Paragraph({
  children: [run(text, { bold: true, color: PURPLE, size: 24 })],
  spacing: { before: 160, after: 60 }     // reducido: antes 240/80
});

const h3 = (text) => new Paragraph({
  children: [run(text, { bold: true, color: PURPLE, size: 21 })],
  spacing: { before: 120, after: 40 }     // reducido: antes 160/60
});

const body = (text) => new Paragraph({
  children: [run(text)],
  spacing: { before: 40, after: 40 }      // reducido: antes 60/60
});

const labelBody = (label, text) => new Paragraph({
  children: [orangeRun(label + ": "), run(text)],
  spacing: { before: 60, after: 60 }
});

const numbered = (num, label, text) => new Paragraph({
  children: [orangeRun(`${num}. `, 20, true), run(label, { bold: true }), run(": " + text)],
  spacing: { before: 50, after: 50 }      // reducido: antes 60/60
});

const bullet = (text) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  children: [run(text)],
  spacing: { before: 30, after: 30 }      // reducido: antes 40/40
});

const pb = () => new Paragraph({ children: [new PageBreak()] });
const spacer = (before = 80) => new Paragraph({ text: "", spacing: { before } }); // reducido default

// ─── Helpers de tabla ────────────────────────────────────────────────────────

const tableBorders = {
  top:     { style: BorderStyle.SINGLE, size: 4, color: PURPLE },
  bottom:  { style: BorderStyle.SINGLE, size: 4, color: PURPLE },
  left:    { style: BorderStyle.SINGLE, size: 4, color: PURPLE },
  right:   { style: BorderStyle.SINGLE, size: 4, color: PURPLE },
  insideH: { style: BorderStyle.SINGLE, size: 2, color: "E5E7EB" },
  insideV: { style: BorderStyle.SINGLE, size: 2, color: "E5E7EB" },
};

const headerCell = (text, width) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  shading: { fill: PURPLE_TABLE, type: ShadingType.CLEAR },
  margins: { top: 70, bottom: 70, left: 120, right: 120 },
  verticalAlign: VerticalAlign.CENTER,
  children: [new Paragraph({
    children: [run(text, { bold: true, color: WHITE, size: 18 })]
  })]
});

const dataCell = (text, width, opts = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
  margins: { top: 70, bottom: 70, left: 120, right: 120 },
  verticalAlign: opts.valign || VerticalAlign.TOP,
  children: opts.children || [new Paragraph({ children: [run(text, { size: 18, ...opts.runOpts })] })]
});

const semCell = (active) => new TableCell({
  width: { size: 500, type: WidthType.DXA },
  shading: active ? { fill: "C4B5FD", type: ShadingType.CLEAR } : undefined,
  margins: { top: 70, bottom: 70, left: 60, right: 60 },
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [run(active ? "✓" : " ", { bold: true, color: active ? PURPLE : WHITE, size: 18 })]
  })]
});

// ─── Header y Footer de página ───────────────────────────────────────────────

/**
 * Header: Logo /hiumanlab® + tagline (SVG reconstruido como texto)
 * Se posiciona arriba a la izquierda con línea divisoria inferior
 */
const buildPageHeader = () => new Header({
  children: [
    new Paragraph({
      children: [
        new TextRun({ text: "/", bold: true, color: PURPLE, size: 28, font: "Arial Black" }),
        new TextRun({ text: "hiuman", bold: true, color: DARK, size: 22, font: "Arial Black" }),
        new TextRun({ text: "lab", bold: true, color: DARK, size: 22, font: "Arial Black" }),
        new TextRun({ text: "®  ", color: DARK, size: 12 }),
        new TextRun({ text: "Creating Technology Together", color: "888888", size: 14, italics: true }),
      ],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB", space: 4 }
      },
      spacing: { after: 80 }
    })
  ]
});

/**
 * Footer: 4 columnas — Logo iucorporation | ¡Contáctanos! | CDMX | MID | Redes
 */
const buildPageFooter = () => new Footer({
  children: [
    // Línea superior del footer
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB", space: 4 } },
      spacing: { before: 0, after: 60 },
      children: []
    }),
    new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: [1400, 1700, 2600, 2400, 900],
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE },
      },
      rows: [new TableRow({
        children: [
          // Col 1: Logo iucorporation + URL
          new TableCell({
            width: { size: 1400, type: WidthType.DXA },
            margins: { top: 0, bottom: 0, left: 0, right: 60 },
            children: [
              new Paragraph({ children: [
                run("/", { bold: true, color: PURPLE, size: 18, font: "Arial Black" }),
                run("iu", { bold: true, color: DARK, size: 13, font: "Arial Black" }),
                run("corporation", { bold: true, color: DARK, size: 11, font: "Arial" }),
              ], spacing: { after: 30 } }),
              new Paragraph({ children: [run("www.", { size: 14, color: GRAY_TEXT }), run("iucorporation", { size: 14, color: PURPLE, bold: true }), run(".com", { size: 14, color: GRAY_TEXT })], spacing: { after: 20 } }),
              new Paragraph({ children: [run("info", { size: 14, color: PURPLE, bold: true }), run("@iucorporation.com", { size: 14, color: GRAY_TEXT })], spacing: { after: 0 } }),
            ]
          }),
          // Col 2: ¡Contáctanos!
          new TableCell({
            width: { size: 1700, type: WidthType.DXA },
            margins: { top: 0, bottom: 0, left: 60, right: 60 },
            children: [
              new Paragraph({ children: [run("¡Contáctanos!", { bold: true, size: 14, color: DARK })], spacing: { after: 20 } }),
              new Paragraph({ children: [run("www.", { size: 13, color: GRAY_TEXT }), run("iucorporation", { size: 13, color: PURPLE, bold: true }), run(".com", { size: 13, color: GRAY_TEXT })], spacing: { after: 15 } }),
              new Paragraph({ children: [run("info", { size: 13, color: PURPLE, bold: true }), run("@iucorporation.com", { size: 13, color: GRAY_TEXT })], spacing: { after: 0 } }),
            ]
          }),
          // Col 3: CDMX
          new TableCell({
            width: { size: 2600, type: WidthType.DXA },
            margins: { top: 0, bottom: 0, left: 60, right: 60 },
            children: [
              new Paragraph({ children: [run("CDMX", { bold: true, size: 14, color: PURPLE_DARK })], spacing: { after: 20 } }),
              new Paragraph({ children: [run("⊙ Insurgentes Sur 933, 4 Piso, Nápoles, CP. 03810", { size: 13, color: GRAY_TEXT })], spacing: { after: 15 } }),
              new Paragraph({ children: [run("+52 (55) 5523.7063  |  +52 (55) 6800.2226", { size: 13, color: GRAY_TEXT })], spacing: { after: 15 } }),
              new Paragraph({ children: [run("Info@iucorporation.com", { size: 13, color: GRAY_TEXT })], spacing: { after: 0 } }),
            ]
          }),
          // Col 4: MID
          new TableCell({
            width: { size: 2400, type: WidthType.DXA },
            margins: { top: 0, bottom: 0, left: 60, right: 60 },
            children: [
              new Paragraph({ children: [run("MID", { bold: true, size: 14, color: PURPLE_DARK })], spacing: { after: 20 } }),
              new Paragraph({ children: [run("⊙ Calle 15 No. 122 por 24 y 26, CP. 97125", { size: 13, color: GRAY_TEXT })], spacing: { after: 15 } }),
              new Paragraph({ children: [run("+52 (999) 666.0350", { size: 13, color: GRAY_TEXT })], spacing: { after: 15 } }),
              new Paragraph({ children: [run("contacto", { size: 13, color: PURPLE, bold: true }), run("@hiumanlab.com", { size: 13, color: GRAY_TEXT })], spacing: { after: 0 } }),
            ]
          }),
          // Col 5: Redes sociales
          new TableCell({
            width: { size: 900, type: WidthType.DXA },
            margins: { top: 0, bottom: 0, left: 60, right: 0 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({ children: [run("f", { bold: true, size: 16, color: PURPLE })], spacing: { after: 15 } }),
              new Paragraph({ children: [run("in", { bold: true, size: 16, color: PURPLE })], spacing: { after: 15 } }),
              new Paragraph({ children: [run("⊙", { bold: true, size: 16, color: PURPLE })], spacing: { after: 0 } }),
            ]
          }),
        ]
      })]
    })
  ]
});

// ─── Términos estándar ───────────────────────────────────────────────────────

const getTerms = (clientName) => [
  ["Exclusión de Costos de Infraestructura", `Esta propuesta no incluye costos asociados a infraestructura tecnológica, plataformas de terceros, servicios en la nube ni cualquier otro dispositivo de hardware o software requerido por el cliente. ${clientName} es quien debe cubrir con los costos adicionales de plataformas a integrar.`],
  ["Alcance del Proyecto", "El alcance del proyecto abarca únicamente las actividades de análisis, diagnóstico, propuesta y desarrollo de la solución descritas en el documento. Cualquier solicitud adicional será considerada como un cambio de alcance y requerirá una nueva estimación y presupuesto."],
  ["Precios e Impuestos", "Todos los precios expresados en esta propuesta están en pesos mexicanos y no incluyen ningún tipo de impuesto."],
  ["Confidencialidad", "Ambas partes se comprometen a mantener la confidencialidad de la información compartida durante el proyecto, sin divulgar detalles a terceros sin autorización previa."],
  ["Tiempos de Entrega", "Los plazos de cada fase están sujetos a la disponibilidad de información por parte del cliente."],
  ["Responsable del Proyecto", "El cliente deberá designar un responsable del proyecto que facilite la comunicación, el seguimiento y la ejecución de las actividades descritas en esta propuesta."],
  ["Responsabilidades del Cliente", "El cliente deberá proporcionar acceso oportuno a la información y al personal necesario para realizar el análisis, así como los insumos necesarios. La falta de colaboración puede impactar en los tiempos de entrega y calidad del diagnóstico."],
  ["Dependencia de Insumos del Cliente", "Los tiempos de implementación están sujetos a la entrega oportuna de los insumos requeridos por parte del cliente, como documentos estratégicos, aprobaciones y datos específicos."],
  ["Limitación de Responsabilidad", "El proveedor no se hace responsable de decisiones comerciales o de implementación basadas en el informe y propuestas entregadas. La implementación de cualquier recomendación será responsabilidad del cliente."],
  ["Cambios en el Alcance", "Si durante el análisis surgen nuevos requisitos o se identifican necesidades adicionales, estas se considerarán cambios de alcance y se presupuestará como proyectos independientes."],
  ["Garantía de Servicios", "El proveedor garantiza que el análisis se realizará de acuerdo con los estándares de calidad acordados. Se ofrecerá una revisión final para aclarar cualquier duda o ajuste solicitado por el cliente dentro del alcance inicial. Además, se ofrece una garantía de 30 días tras la entrega que cubre las correcciones de defectos derivados del desarrollo. No incluye cambios en los requisitos iniciales ni nuevas funcionalidades."],
  ["Resolución de disputas", "Cualquier disputa derivada del proyecto se resolverá mediante negociación entre las partes. Si no se llega a un acuerdo, se someterá a un proceso de mediación conforme a la jurisdicción aplicable."],
  ["Cumplimiento Normativo", "El análisis y la propuesta de solución buscarán el cumplimiento con las normativas y regulaciones locales aplicables, especialmente en cuanto a protección de datos y privacidad."],
  ["Rescisión del Contrato", "Cualquiera de las partes podrá rescindir el contrato si la otra incumple con los términos establecidos, con un aviso previo de 15 días. Los pagos realizados hasta la fecha no serán reembolsables en caso de rescisión por parte del cliente."],
  ["Viáticos", "Los costos relacionados con viáticos, desplazamientos o cualquier gasto asociado a visitas presenciales no están incluidos en esta propuesta. En caso de que se requieran actividades presenciales, dichos gastos serán cubiertos por el cliente previa aprobación."],
  ["Impuestos", "Los precios detallados no incluyen el Impuesto al Valor Agregado (IVA) ni ningún otro impuesto aplicable. En caso de que proceda, estos serán agregados de acuerdo con la legislación fiscal vigente al momento de la facturación."],
  ["Vigencia de la Propuesta", "Esta propuesta tiene una vigencia de quince (15) días naturales a partir de la fecha de emisión. Pasado este período, los términos, condiciones y precios podrán estar sujetos a revisión y ajuste, de ser necesario."],
  ["Contratos", "Es necesaria la firma del contrato para la ejecución de cualquiera de los proyectos."],
  ["Requerimientos Funcionales", "Los requerimientos especificados en este documento son de naturaleza funcional y no evolutiva. Se entiende que la implementación cubrirá únicamente las funcionalidades descritas en el alcance del proyecto, sin incluir mejoras o evoluciones futuras del sistema."],
  ["Calendarización de Sesiones", "Se establecerán reuniones semanales de seguimiento del proyecto, en las cuales la hora y días serán determinadas en el proceso del KickOff. Las sesiones tendrán una duración máxima de 60 minutos y serán realizadas de manera virtual. Cualquier cambio en la calendarización será comunicado con al menos 24 horas de anticipación."],
  ["Responsabilidad de Proveedores Externos y cliente", "El proveedor no se hace responsable por fallas, interrupciones o problemas derivados de servicios de proveedores externos o proceso del cliente, incluyendo pero no limitado a servicios de hosting, bases de datos, APIs de terceros, servicios de autenticación o cualquier otra infraestructura tecnológica que no esté bajo el control directo del proveedor."],
  ["Exclusiones del Alcance - Alertas y Notificaciones", "Esta propuesta no incluye la implementación de sistemas de alertas, notificaciones push, emails automáticos, SMS o cualquier otro mecanismo de comunicación automática. El alcance se limita a la funcionalidad de los módulos descritos en la propuesta según aplique."],
  ["Funcionamiento Online", "La aplicación web funcionará únicamente en modo online, requiriendo conexión a internet para el acceso y funcionamiento de todas las funcionalidades. No se incluye la implementación de funcionalidades offline o sincronización de datos en modo desconectado."]
];

// ─── Generador principal ─────────────────────────────────────────────────────

async function generateDocxBuffer(p) {
  const terms = getTerms(p.tituloCliente);

  // ── Render Mermaid diagrams to PNG ──────────────────────────────────────
  console.log('Rendering Mermaid diagrams...');
  let imgArquitectura = null;
  let imgFlujo        = null;
  let imgRoles        = null;

  const renderDiagram = async (code) => {
    try { return await mermaidToPng(code, { width: 900 }); }
    catch (e) { console.error('Mermaid render error:', e.message); return null; }
  };

  if (p.diagramas?.arquitectura) imgArquitectura = await renderDiagram(p.diagramas.arquitectura);
  if (p.diagramas?.flujo)        imgFlujo        = await renderDiagram(p.diagramas.flujo);
  if (p.diagramas?.roles)        imgRoles        = await renderDiagram(p.diagramas.roles);

  console.log('Diagrams rendered. Building document...');

  const tiemposFases = [
    { name: "Levantamiento de Requerimientos",       ...p.tiempos.levantamiento },
    { name: "Maquetación con Figma (UI/UX)",         ...p.tiempos.maqueta },
    { name: "Desarrollo de la plataforma - Módulos", ...p.tiempos.desarrollo },
    { name: "Pruebas de funcionalidad UAT",          ...p.tiempos.qa },
  ];

  const preciosFila = [
    { name: "Levantamiento de Requerimientos",       val: p.precios.levantamiento },
    { name: "Diseño de Maquetación con Figma (UI/UX)", val: p.precios.maqueta },
    { name: "Desarrollo de la plataforma",           val: p.precios.desarrollo },
    { name: "Pruebas de funcionalidad UAT",          val: p.precios.qa },
  ];

  const pageHeader = buildPageHeader();
  const pageFooter = buildPageFooter();

  const doc = new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }]
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 20, color: DARK } } }
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1200, right: 1800, bottom: 1440, left: 1800, header: 600, footer: 600 }
        }
      },
      headers: { default: pageHeader },
      footers: { default: pageFooter },
      children: [

        // ── PORTADA ──────────────────────────────────────────────────────────
        spacer(1800),   // reducido de 2400
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [run(p.tituloProyecto, { bold: true, size: 52, color: DARK, font: "Arial Black" })],
          spacing: { after: 200 }
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [run(p.tituloCliente, { bold: true, size: 36, color: DARK, font: "Arial Black" })],
          spacing: { after: 360 }
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [run("ACTA ENTENDIMIENTO Y PROPUESTA ECONÓMICA", { size: 22, color: "555555" })],
          spacing: { after: 100 }
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [orangeRun(p.fechaProyecto, 24)],
          spacing: { after: 480 }
        }),
        new Table({
          width: { size: 3000, type: WidthType.DXA },
          columnWidths: [1500, 1500],
          borders: tableBorders,
          rows: [new TableRow({ children: [
            dataCell("Versión No", 1500, { runOpts: { bold: true } }),
            dataCell("1.0",        1500, { runOpts: { bold: true } })
          ]})]
        }),
        pb(),

        // ── DESCRIPCIÓN ───────────────────────────────────────────────────────
        h1("DESCRIPCIÓN DEL REQUERIMIENTO"),
        body(p.descripcionProyecto),
        pb(),

        // ── PROPUESTA ─────────────────────────────────────────────────────────
        h1("NUESTRA PROPUESTA"),
        body(p.laPropuesta),
        h2("Objetivo de la Propuesta"),   body(p.objetivoPropuesta),
        h2("Principios de Diseño"),       body(p.principiosDisenio),
        h2("Principios Técnicos"),        body(p.principiosTecnicos),
        h2("Principios de Seguridad"),    body(p.principiosSeguridad),
        h2("Arquitectura Propuesta"),     body(p.arquitecturaPropuesta),
        h2("Metodología de Trabajo"),     body(p.metodologiaTrabajo),
        h2("Entregables"),
        ...(Array.isArray(p.entregables)
          ? p.entregables
          : [p.entregables]).map(e => bullet(e)),
        pb(),

        // ── MÓDULOS ───────────────────────────────────────────────────────────
        h1("ALCANCES FUNCIONALES"),
        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [2500, 6500],
          borders: tableBorders,
          rows: [
            new TableRow({ children: [headerCell("Módulo", 2500), headerCell("Descripción", 6500)] }),
            ...p.modulos.map(m => new TableRow({ children: [
              new TableCell({
                width: { size: 2500, type: WidthType.DXA },
                shading: { fill: LIGHT_PURPLE, type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({ children: [run(m.titulo, { bold: true, color: PURPLE, size: 18 })] })]
              }),
              new TableCell({
                width: { size: 6500, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [
                  new Paragraph({ children: [orangeRun("Objetivo: ", 18), run(m.objetivo, { size: 18 })] }),
                  new Paragraph({ children: [orangeRun("Actividades:", 18)], spacing: { before: 60, after: 40 } }),
                  ...(Array.isArray(m.actividades) ? m.actividades : [m.actividades])
                    .map(a => new Paragraph({
                      children: [run("• " + a, { size: 18 })],
                      indent: { left: 240 },
                      spacing: { before: 20, after: 20 }
                    }))
                ]
              })
            ]}))
          ]
        }),
        pb(),

        // ── DIAGRAMAS ─────────────────────────────────────────────────────────
        h1("DIAGRAMAS"),
        h3("- Arquitectura General:"),
        ...(imgArquitectura
          ? [new Paragraph({ children: [new ImageRun({ data: imgArquitectura, transformation: { width: 590, height: 300 }, type: 'png' })], spacing: { before: 80, after: 160 } })]
          : [body(p.diagramas.arquitectura)]),
        h3("- Diagrama de Flujo de Información:"),
        ...(imgFlujo
          ? [new Paragraph({ children: [new ImageRun({ data: imgFlujo, transformation: { width: 590, height: 300 }, type: 'png' })], spacing: { before: 80, after: 160 } })]
          : [body(p.diagramas.flujo)]),
        h3("- Diagrama de Roles:"),
        ...(imgRoles
          ? [new Paragraph({ children: [new ImageRun({ data: imgRoles, transformation: { width: 590, height: 280 }, type: 'png' })], spacing: { before: 80, after: 160 } })]
          : [body(p.diagramas.roles)]),
        pb(),

        // ── CRITERIOS ─────────────────────────────────────────────────────────
        h1("CRITERIOS DE ACEPTACIÓN"),
        body(p.criteriosAceptacionGeneral),
        spacer(80),
        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [2500, 6500],
          borders: tableBorders,
          rows: [
            new TableRow({ children: [headerCell("Criterio de Aceptación", 2500), headerCell("Descripción", 6500)] }),
            ...p.criteriosPorModulo.map(c => new TableRow({ children: [
              new TableCell({
                width: { size: 2500, type: WidthType.DXA },
                shading: { fill: LIGHT_PURPLE, type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({ children: [run(c.titulo, { bold: true, color: PURPLE, size: 18 })] })]
              }),
              new TableCell({
                width: { size: 6500, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [
                  new Paragraph({ children: [orangeRun("Reglas de Negocio:", 18)], spacing: { after: 40 } }),
                  new Paragraph({ children: [run(c.reglasNegocio, { size: 18 })], spacing: { after: 60 } }),
                  new Paragraph({ children: [orangeRun("Aceptación:", 18)], spacing: { after: 40 } }),
                  new Paragraph({ children: [run(c.criteriosAceptacion, { size: 18 })] })
                ]
              })
            ]}))
          ]
        }),
        spacer(160),
        h1("EXCLUSIONES EXPLÍCITAS DE LA PROPUESTA"),
        ...(Array.isArray(p.exclusionesExplicitas)
          ? p.exclusionesExplicitas
          : [p.exclusionesExplicitas]).map(e => bullet(e)),
        spacer(160),
        h1("ROLES Y RESPONSABILIDADES DEL PROYECTO"),
        body(p.rolesResponsabilidades),
        h3("Principios de Responsabilidad"),
        body(p.principiosResponsabilidad),
        pb(),

        // ── TIEMPOS ───────────────────────────────────────────────────────────
        h1("TIEMPO DE ENTREGA."),
        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [2600, 1000, 500, 500, 500, 500, 500, 500, 500],
          borders: tableBorders,
          rows: [
            new TableRow({ children: [
              headerCell("Fase / ID", 2600),
              headerCell("Estimación", 1000),
              ...[1,2,3,4,5,6,7].map(n => headerCell(`S${n}`, 500))
            ]}),
            ...tiemposFases.map(t => new TableRow({ children: [
              new TableCell({
                width: { size: 2600, type: WidthType.DXA },
                margins: { top: 70, bottom: 70, left: 120, right: 120 },
                children: [new Paragraph({ children: [run(t.name, { bold: true, size: 18 })] })]
              }),
              new TableCell({
                width: { size: 1000, type: WidthType.DXA },
                margins: { top: 70, bottom: 70, left: 80, right: 80 },
                children: [new Paragraph({ children: [run(`${t.dias}d / ${t.hrs}hrs`, { size: 16 })] })]
              }),
              ...[1,2,3,4,5,6,7].map(w => semCell(t.semanas.includes(w)))
            ]}))
          ]
        }),
        spacer(80),
        new Paragraph({
          children: [run('"Los tiempos pueden ajustarse en función de la entrega oportuna de insumos por parte del cliente."',
            { italics: true, size: 18, color: GRAY_TEXT })],
          spacing: { before: 60, after: 60 }
        }),
        pb(),

        // ── PROPUESTA ECONÓMICA ───────────────────────────────────────────────
        h1("PROPUESTA ECONÓMICA."),
        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [6500, 2500],
          borders: tableBorders,
          rows: [
            new TableRow({ children: [headerCell("Requerimiento", 6500), headerCell("Inversión (MXN)*", 2500)] }),
            ...preciosFila.map(i => new TableRow({ children: [
              dataCell(i.name, 6500, { runOpts: { bold: true } }),
              new TableCell({
                width: { size: 2500, type: WidthType.DXA },
                margins: { top: 70, bottom: 70, left: 120, right: 120 },
                children: [new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [orangeRun(`$${Number(i.val).toLocaleString('es-MX')}`, 18)]
                })]
              })
            ]})),
            new TableRow({ children: [
              new TableCell({
                width: { size: 6500, type: WidthType.DXA },
                shading: { fill: "F3F0FF", type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 120, right: 120 },
                children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("TOTAL", { bold: true, size: 22 })] })]
              }),
              new TableCell({
                width: { size: 2500, type: WidthType.DXA },
                shading: { fill: ORANGE, type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 120, right: 120 },
                children: [new Paragraph({ children: [run(`$${Number(p.precios.total).toLocaleString('es-MX')}`, { bold: true, color: WHITE, size: 22 })] })]
              })
            ]})
          ]
        }),
        new Paragraph({
          children: [run("*Precios más IVA", { italics: true, size: 18, color: GRAY_TEXT })],
          spacing: { before: 80, after: 80 }
        }),
        body("Esta propuesta establece una evolución clara, controlada y escalable de la plataforma y los módulos."),
        body("Cualquier ampliación futura deberá tratarse como una nueva fase de evolución del producto."),
        pb(),

        // ── CONDICIONES DE PAGO ───────────────────────────────────────────────
        h1("CONDICIONES DE PAGO."),
        labelBody("Pago 1", "Se deberá realizar un pago del 33% del monto total como anticipo para el inicio de las actividades del proyecto."),
        labelBody("Pago 2", "El 33% al llevar la mitad del proyecto."),
        labelBody("Pago 3", "El 33% restante deberá ser abonado al momento de completar el 100% del alcance del proyecto y entregar los entregables acordados."),
        spacer(160),

        // ── TÉRMINOS Y CONDICIONES ────────────────────────────────────────────
        h1("TÉRMINOS Y CONDICIONES."),
        ...terms.map(([label, text], i) => numbered(i + 1, label, text)),
      ]
    }]
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateDocxBuffer };
