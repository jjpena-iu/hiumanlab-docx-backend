const puppeteer = require('puppeteer');

/**
 * Renders a Mermaid diagram string to a PNG Buffer.
 * Uses a headless Chromium browser via Puppeteer.
 */
async function mermaidToPng(mermaidCode, options = {}) {
  const { width = 900, backgroundColor = '#ffffff' } = options;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 600 });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body { margin: 0; padding: 20px; background: ${backgroundColor}; font-family: Arial, sans-serif; }
    #diagram { display: inline-block; }
    .mermaid { background: ${backgroundColor}; }
  </style>
</head>
<body>
  <div id="diagram" class="mermaid">${mermaidCode}</div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      themeVariables: {
        primaryColor: '#EDE8FB',
        primaryTextColor: '#1A1A2E',
        primaryBorderColor: '#8747ED',
        lineColor: '#8747ED',
        secondaryColor: '#FFF3E0',
        tertiaryColor: '#F8F7FF',
        fontFamily: 'Arial',
        fontSize: '14px'
      }
    });
  </script>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for Mermaid to finish rendering
    await page.waitForSelector('#diagram svg', { timeout: 15000 });
    await page.waitForTimeout(500);

    // Get the actual rendered size
    const element = await page.$('#diagram');
    const box = await element.boundingBox();

    await page.setViewport({
      width: Math.ceil(box.width + 40),
      height: Math.ceil(box.height + 40)
    });

    const png = await element.screenshot({
      type: 'png',
      omitBackground: false
    });

    return png;
  } finally {
    await browser.close();
  }
}

module.exports = { mermaidToPng };
