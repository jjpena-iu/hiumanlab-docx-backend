const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

function sanitizeMermaid(code) {
  if (!code) return '';
  let c = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  c = c.replace(/[^\x00-\x7F]/g, ch => {
    return {'®':'(R)','©':'(C)','™':'(TM)','→':'-->','←':'<--','↔':'<-->'}[ch] || '';
  });
  return c;
}

async function mermaidToPng(mermaidCode, opts = {}) {
  const code = sanitizeMermaid(mermaidCode);
  if (!code) throw new Error('Empty mermaid code');

  const tmpDir     = os.tmpdir();
  const ts         = Date.now();
  const inputFile  = path.join(tmpDir, `mmd_${ts}.mmd`);
  const outFile    = path.join(tmpDir, `mmd_${ts}.png`);
  const configFile = path.join(tmpDir, `mmd_cfg_${ts}.json`);

  const config = {
    theme: 'base',
    themeVariables: {
      primaryColor: '#EEE8F8',
      primaryTextColor: '#1A1A2E',
      primaryBorderColor: '#7B5EA7',
      lineColor: '#7B5EA7',
      background: '#ffffff'
    }
  };

  try {
    fs.writeFileSync(inputFile,  code,                      'utf8');
    fs.writeFileSync(configFile, JSON.stringify(config),    'utf8');

    const mmdcPath   = path.join(process.cwd(), 'node_modules', '.bin', 'mmdc');
    // Usar Chromium del sistema (instalado via nixpacks) si está disponible
    const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || '';
    const extraEnv     = chromiumPath
      ? { ...process.env, PUPPETEER_EXECUTABLE_PATH: chromiumPath }
      : process.env;

    execSync(
      `"${mmdcPath}" -i "${inputFile}" -o "${outFile}" -c "${configFile}" -b white -w 800 --puppeteerConfigFile /dev/null`,
      { timeout: 60000, env: extraEnv }
    );

    if (!fs.existsSync(outFile)) throw new Error('mmdc produced no output');
    return fs.readFileSync(outFile);

  } finally {
    [inputFile, outFile, configFile].forEach(f => { try { fs.unlinkSync(f); } catch {} });
  }
}

module.exports = { mermaidToPng };
