const express = require('express');
const { generateDocxBuffer } = require('./docxGenerator');

const app = express();

// CORS explícito — permite cualquier origen incluyendo AI Studio
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '4mb' }));

// Timeout extendido para Mermaid/Puppeteer
app.use((req, res, next) => {
  req.setTimeout(120000);
  res.setTimeout(120000);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'hiumanlab-docx-backend' });
});

// Generate .docx
app.post('/generate-docx', async (req, res) => {
  try {
    const data = req.body;

    if (!data || !data.tituloProyecto) {
      return res.status(400).json({ error: 'Missing required field: tituloProyecto' });
    }

    console.log(`Generating DOCX for: ${data.tituloProyecto} / ${data.tituloCliente}`);

    const buffer = await generateDocxBuffer(data);

    const filename = `Acta_${data.tituloCliente}_${data.tituloProyecto}`
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\-]/g, '')
      .substring(0, 80);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
    res.send(buffer);

    console.log(`✅ DOCX generated successfully: ${filename}.docx`);

  } catch (err) {
    console.error('❌ Error generating docx:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
