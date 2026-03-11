/**
 * Renders a Mermaid diagram string to a PNG Buffer
 * using the free mermaid.ink API — no Puppeteer needed.
 */
async function mermaidToPng(mermaidCode) {
  const encoded = Buffer.from(mermaidCode, 'utf-8').toString('base64');
  const url = `https://mermaid.ink/img/${encoded}?type=png&width=900&theme=base`;

  const https = require('https');

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`mermaid.ink returned ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = { mermaidToPng };
