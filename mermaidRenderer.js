const puppeteer = require('puppeteer');

/**
 * Sanitiza el código Mermaid para evitar errores de parsing:
 * - Elimina saltos de línea dentro de labels de nodos
 * - Normaliza comillas
 */
function sanitizeMermaid(code) {
  if (!code) return '';
  // Normalizar saltos de línea
  let clean = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  // Eliminar caracteres especiales problemáticos en labels
  clean = clean.replace(/[^\x00-\x7F]/g, (ch) => {
    const safe = { '®': '(R)', '©': '(C)', '™': '(TM)', '→': '-->', '←': '<--', '↔': '<-->' };
    return safe[ch] || '';
  });
  return clean;
}

/**
 * Renderiza un diagrama Mermaid a PNG via Puppeteer
 * @param {string} mermaidCode - Código Mermaid
 * @param {object} opts - { width: number }
 * @returns {Buffer} PNG buffer
 */
async function mermaidToPng(mermaidCode, opts = {}) {
  const width = opts.width || 800;
  const code = sanitizeMermaid(mermaidCode);

  if (!code) throw new Error('Empty mermaid code');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; font-family: Arial, sans-serif; }
    #container { padding: 20px; display: inline-block; min-width: 200px; }
    .mermaid svg { max-width: 100%; }
  </style>
</head>
<body>
  <div id="container">
    <div class="mermaid">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      themeVariables: {
        primaryColor: '#EEE8F8',
        primaryTextColor: '#1A1A2E',
        primaryBorderColor: '#7B5EA7',
        lineColor: '#7B5EA7',
        secondaryColor: '#f0ebff',
        tertiaryColor: '#fff'
      },
      flowchart: { useMaxWidth: true, htmlLabels: true },
      sequence: { useMaxWidth: true }
    });
    window.mermaidReady = false;
    mermaid.init(undefined, '.mermaid').then(() => {
      window.mermaidReady = true;
    }).catch(e => {
      window.mermaidError = e.message;
      window.mermaidReady = true;
    });
  </script>
</body>
</html>`;

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height: 600, deviceScaleFactor: 1.5 });

    // Interceptar errores de red para no fallar por CDN
    await page.setRequestInterception(false);

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // Esperar a que Mermaid termine de renderizar
    await page.waitForFunction('window.mermaidReady === true', { timeout: 30000 });

    const errorMsg = await page.evaluate(() => window.mermaidError);
    if (errorMsg) {
      throw new Error(`Mermaid parse error: ${errorMsg}`);
    }

    // Obtener el SVG renderizado
    const container = await page.$('#container');
    if (!container) throw new Error('Container not found');

    const screenshot = await container.screenshot({
      type: 'png',
      omitBackground: false
    });

    return screenshot;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { mermaidToPng };
