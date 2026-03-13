const { execSync, exec } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

function sanitizeMermaid(code) {
  if (!code) return '';
  let c = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  // Reemplazar caracteres no-ASCII problemáticos
  c = c.replace(/[^\x00-\x7F]/g, ch => {
    return {'®':'(R)','©':'(C)','™':'(TM)','→':'-->','←':'<--','↔':'<-->'}[ch] || '';
  });
  return c;
}

/**
 * Renderiza Mermaid a PNG usando @mermaid-js/mermaid-cli (mmdc)
 * Funciona en Railway sin necesitar browser externo
 */
async function mermaidToPng(mermaidCode, opts = {}) {
  const code = sanitizeMermaid(mermaidCode);
  if (!code) throw new Error('Empty mermaid code');

  const tmpDir    = os.tmpdir();
  const inputFile = path.join(tmpDir, `mermaid_${Date.now()}.mmd`);
  const outFile   = path.join(tmpDir, `mermaid_${Date.now()}.png`);

  const configJson = JSON.stringify({
    theme: 'base',
    themeVariables: {
      primaryColor:       '#EEE8F8',
      primaryTextColor:   '#1A1A2E',
      primaryBorderColor: '#7B5EA7',
      lineColor:          '#7B5EA7',
      secondaryColor:     '#f0ebff',
      background:         '#ffffff'
    }
  });

  const configFile = path.join(tmpDir, `mermaid_cfg_${Date.now()}.json`);

  try {
    fs.writeFileSync(inputFile,  code,       'utf8');
    fs.writeFileSync(configFile, configJson, 'utf8');

    // mmdc instalado globalmente via package.json postinstall o como dep
    const mmdcPath = path.join(process.cwd(), 'node_modules', '.bin', 'mmdc');

    execSync(
      `"${mmdcPath}" -i "${inputFile}" -o "${outFile}" -c "${configFile}" -b white -w 800`,
      {
        timeout: 30000,
        env: {
          ...process.env,
          PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'true',
          // mmdc usará el Chromium del sistema si está disponible
        }
      }
    );

    if (!fs.existsSync(outFile)) throw new Error('mmdc did not produce output file');

    const buffer = fs.readFileSync(outFile);
    return buffer;

  } finally {
    try { fs.unlinkSync(inputFile);  } catch {}
    try { fs.unlinkSync(outFile);    } catch {}
    try { fs.unlinkSync(configFile); } catch {}
  }
}

module.exports = { mermaidToPng };
