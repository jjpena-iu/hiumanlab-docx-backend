const express = require('express');
const cors = require('cors');
const { generateDocxBuffer } = require('./docxGenerator');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
// Mermaid rendering via Puppeteer can take 15-30s
app.use((req, res, next) => { req.setTimeout(120000); res.setTimeout(120000); next(); });

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', service: 'hiumanlab-docx-backend' }));

// Generate .docx
app.post('/generate-docx', async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.tituloProyecto) {
      return res.status(400).json({ error: 'Missing required field: tituloProyecto' });
    }

    const buffer = await generateDocxBuffer(data);
    const filename = `Acta_${data.tituloCliente}_${data.tituloProyecto}`
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\-]/g, '')
      .substring(0, 80);

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
