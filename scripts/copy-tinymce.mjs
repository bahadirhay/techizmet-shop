import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "node_modules", "tinymce");
const dest = path.join(root, "public", "tinymce");

if (!fs.existsSync(src)) {
  console.warn("[copy-tinymce] tinymce paketi yok, atlanıyor");
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log("[copy-tinymce] public/tinymce hazır");
