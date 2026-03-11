import { ProjectData } from "../types";

// 🔧 Cambia esta URL después de hacer deploy en Railway
const BACKEND_URL = "https://hiumanlab-docx-backend.up.railway.app";

export async function generateDocx(data: ProjectData): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/generate-docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || "Error generando el documento");
  }

  // Descargar el blob como archivo
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const filename = `Acta_${data.tituloCliente}_${data.tituloProyecto}`
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "")
    .substring(0, 80);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
