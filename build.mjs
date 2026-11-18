// Builds the prototype into ./docs (plain files: open docs/index.html, or let GitHub Pages serve /docs).
// Usage: node build.mjs        (or: npm run build)
import { build } from "esbuild";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";

mkdirSync("docs/assets", { recursive: true });
await build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020", "safari15"],
  jsx: "automatic",
  loader: { ".js": "jsx" },
  outfile: "docs/assets/app.js",
  define: { "process.env.NODE_ENV": '"production"' },
  nodePaths: process.env.NODE_PATH ? process.env.NODE_PATH.split(":") : [],
  logLevel: "info",
});
cpSync("index.html", "docs/index.html");
writeFileSync("docs/.nojekyll", "");
