const express = require('express');
const cors    = require('cors');
const { execSync } = require('child_process');
const { generateDocxBuffer } = require('./docxGenerator');

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '4mb' }));
app.use((req, res, next) => { req.setTimeout(120000); res.setTimeout(120000); next(); });

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', service: 'hiumanlab-docx-backend' }));

// Diagnóstico: muestra dónde está Chromium en el sistema
app.get('/debug-chromium', (req, res) => {
  const checks = {};
  const paths = [
    '/run/current-system/sw/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/nix/var/nix/profiles/default/bin/chromium',
  ];
  paths.forEach(p => {
    try { execSync(`test -f "${p}"`); checks[p] = 'EXISTS'; }
    catch { checks[p] = 'not found'; }
  });
  try {
    const which = execSync('which chromium 2>/dev/null || which chromium-browser 2>/dev/null || echo "not in PATH"').toString().trim();
    checks['which'] = which;
  } catch { checks['which'] = 'error'; }
  try {
    const nixFind = execSync('find /nix -name "chromium" -type f 2>/dev/null | head -3').toString().trim();
    checks['nix_find'] = nixFind || 'not found in /nix';
  } catch { checks['nix_find'] = 'error'; }
  checks['PUPPETEER_EXECUTABLE_PATH'] = process.env.PUPPETEER_EXECUTABLE_PATH || 'not set';
  res.json(checks);
});

// Generate .docx
app.post('/generate-docx', async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.tituloProyecto) {
      return res.status(400).json({ error: 'Missing required field: tituloProyecto' });
    }
    const buffer = await generateDocxBuffer(data);
    const filename = `Acta_${data.tituloCliente}_${data.tituloProyecto}`
      .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '').substring(0, 80);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(buffer);
  } catch (err) {
    console.error('Error generating docx:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
