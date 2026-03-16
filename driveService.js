const { google } = require('googleapis');
const { Readable } = require('stream');

// ─── Autenticación con Service Account ───────────────────────────────────────
function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no está configurada en Railway');

  let credentials;
  try {
    credentials = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido');
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

// ─── Crea una subcarpeta dentro de la carpeta raíz ───────────────────────────
async function createSubfolder(drive, folderName, parentId) {
  const res = await drive.files.create({
    requestBody: {
      name:     folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents:  [parentId],
    },
    fields: 'id, webViewLink',
  });
  return res.data;
}

// ─── Sube un archivo a Drive ──────────────────────────────────────────────────
async function uploadFile(drive, { buffer, filename, mimeType, folderId }) {
  const stream = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name:    filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink, name',
  });
  return res.data;
}

// ─── Hace una carpeta/archivo visible para cualquiera con el link ─────────────
async function makePublic(drive, fileId) {
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCIÓN PRINCIPAL — sube DOCX + XLSX a una carpeta nueva en Drive
// ─────────────────────────────────────────────────────────────────────────────
async function saveToDrive({ docxBuffer, xlsxBuffer, tituloCliente, tituloProyecto, fechaProyecto }) {
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  if (!parentFolderId) throw new Error('GOOGLE_DRIVE_PARENT_FOLDER_ID no está configurada en Railway');

  const auth  = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  // Nombre limpio para carpeta y archivos
  const safeName = `${tituloCliente}_${tituloProyecto}`
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '')
    .substring(0, 60);

  const folderName = `Acta_${safeName}_${fechaProyecto?.replace(/\//g, '-') || 'sin-fecha'}`;

  // 1. Crear subcarpeta
  const folder = await createSubfolder(drive, folderName, parentFolderId);
  await makePublic(drive, folder.id);

  const results = { folderName, folderUrl: folder.webViewLink, files: [] };

  // 2. Subir DOCX si viene
  if (docxBuffer) {
    const docxFile = await uploadFile(drive, {
      buffer:   docxBuffer,
      filename: `Acta_${safeName}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      folderId: folder.id,
    });
    await makePublic(drive, docxFile.id);
    results.files.push({ type: 'docx', name: docxFile.name, url: docxFile.webViewLink });
  }

  // 3. Subir XLSX si viene
  if (xlsxBuffer) {
    const xlsxFile = await uploadFile(drive, {
      buffer:   xlsxBuffer,
      filename: `Cotizacion_${safeName}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      folderId: folder.id,
    });
    await makePublic(drive, xlsxFile.id);
    results.files.push({ type: 'xlsx', name: xlsxFile.name, url: xlsxFile.webViewLink });
  }

  return results;
}

module.exports = { saveToDrive };
