/* Panel Marq. — puente seguro hacia GitHub.
   El token real vive en Vercel (variable GITHUB_TOKEN) y nunca llega al navegador.
   Las administradoras entran solo con la contraseña (variable ADMIN_PASSWORD). */

const crypto = require("crypto");

const OWNER = "mariacaram";
const REPO = "marq-estudio";

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Método no permitido" });
    return;
  }

  const pass = process.env.ADMIN_PASSWORD;
  const token = process.env.GITHUB_TOKEN;
  if (!pass || !token) {
    res.status(500).json({ message: "El panel no está configurado: faltan las variables ADMIN_PASSWORD y GITHUB_TOKEN en Vercel." });
    return;
  }

  const { clave, path, method = "GET", ref = "master", body } = req.body || {};
  if (typeof clave !== "string" || !safeEqual(clave, pass)) {
    res.status(401).json({ message: "Contraseña incorrecta" });
    return;
  }
  if (typeof path !== "string" || !path || path.includes("..") || path.startsWith("/") || /[?#\\]/.test(path)) {
    res.status(400).json({ message: "Ruta inválida" });
    return;
  }
  if (!["GET", "PUT", "DELETE"].includes(method)) {
    res.status(400).json({ message: "Método inválido" });
    return;
  }

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodedPath}` +
    (method === "GET" ? `?ref=${encodeURIComponent(ref)}&t=${Date.now()}` : "");

  const ghRes = await fetch(url, {
    method,
    headers: {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github+json",
      "User-Agent": "panel-marq",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const json = await ghRes.json().catch(() => ({}));
  res.status(ghRes.status).json(json);
};
