const puppeteer = require('puppeteer-core');
const chromium  = require('@sparticuz/chromium');

function sanitizeMermaid(code) {
  if (!code) return '';
  let c = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  c = c.replace(/[^\x00-\x7F]/g, ch => {
    return {'®':'(R)','©':'(C)','™':'(TM)','→':'-->','←':'<--','↔':'<-->'}[ch] || '';
  });
  return c;
}

async function mermaidToPng(mermaidCode, opts = {}) {
  const width = opts.width || 800;
  const code  = sanitizeMermaid(mermaidCode);
  if (!code) throw new Error('Empty mermaid code');

  const safeCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"><\/script>
<style>*{margin:0;padding:0}body{background:white;font-family:Arial}
#c{padding:20px;display:inline-block;min-width:200px}</style>
</head><body><div id="c"><div class="mermaid">${safeCode}</div></div>
<script>
mermaid.initialize({startOnLoad:true,theme:'base',
  themeVariables:{primaryColor:'#EEE8F8',primaryTextColor:'#1A1A2E',
  primaryBorderColor:'#7B5EA7',lineColor:'#7B5EA7'},
  flowchart:{useMaxWidth:true,htmlLabels:true}});
window._ready=false;
mermaid.init(undefined,'.mermaid')
  .then(()=>{window._ready=true;})
  .catch(e=>{window._err=e.message;window._ready=true;});
<\/script></body></html>`;

  let browser = null;
  try {
    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setViewport({ width, height: 600, deviceScaleFactor: 1.5 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction('window._ready === true', { timeout: 30000 });
    const err = await page.evaluate(() => window._err);
    if (err) throw new Error('Mermaid error: ' + err);
    const el = await page.$('#c');
    if (!el) throw new Error('Container not found');
    return await el.screenshot({ type: 'png', omitBackground: false });
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { mermaidToPng };
