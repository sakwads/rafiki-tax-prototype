// Tiny static server for Railway (or any Node host). Serves the built prototype in docs/.
// No dependencies. Railway sets PORT; locally it defaults to 3000.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "docs");
const port = Number(process.env.PORT) || 3000;
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/health") { res.writeHead(200, { "content-type": "text/plain" }); return res.end("ok"); }
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = join(root, path);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    const s = await stat(file).catch(() => null);
    if (!s) file = join(root, "index.html"); // the app uses #/routes, so anything unknown gets the app
    else if (s.isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    const ext = extname(file);
    res.writeHead(200, {
      "content-type": types[ext] || "application/octet-stream",
      "cache-control": ext === ".html" || file.endsWith("sw.js") || ext === ".webmanifest" ? "no-cache" : "public, max-age=300",
      "x-content-type-options": "nosniff",
    });
    res.end(body);
  } catch {
    res.writeHead(500); res.end("Server error");
  }
}).listen(port, "0.0.0.0", () => console.log(`Rafiki Tax prototype on port ${port}`));
