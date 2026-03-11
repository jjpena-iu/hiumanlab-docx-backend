# hiumanlab-docx-backend

Microservicio que genera archivos `.docx` con formato hiumanlab.

## Deploy en Railway (gratis)

### Paso 1 — Subir a GitHub
1. Crea un repo nuevo en github.com (ej. `hiumanlab-docx-backend`)
2. Sube esta carpeta:
```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/TU_USUARIO/hiumanlab-docx-backend.git
git push -u origin main
```

### Paso 2 — Deploy en Railway
1. Ve a [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Selecciona tu repo `hiumanlab-docx-backend`
3. Railway detecta Node.js automáticamente y hace deploy
4. Ve a **Settings → Networking → Generate Domain**
5. Copia la URL (ej. `https://hiumanlab-docx-backend.up.railway.app`)

### Paso 3 — Conectar con la app de AI Studio
En `src/services/docxGenerator.ts` de tu app, cambia la URL:
```typescript
const BACKEND_URL = 'https://hiumanlab-docx-backend.up.railway.app';
```

---

## API

### `POST /generate-docx`
Recibe el JSON de la propuesta y devuelve el archivo `.docx`.

**Request body:** objeto `ProjectData` (ver `src/types.ts` de la app)

**Response:** archivo `.docx` como descarga binaria

---

## Desarrollo local
```bash
npm install
npm start
# Servidor en http://localhost:3000
```
