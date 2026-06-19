import { readFileSync } from "node:fs";

const file = process.argv[2] || "tmp-girtlak-page.html";
const h = readFileSync(file, "utf8");
const media = [...h.matchAll(/\/api\/media\/[a-z0-9]+/g)].map((m) => m[0]);
const uploads = [...h.matchAll(/\/uploads\/shop\/[^"\\]+/g)].map((m) => m[0]);
console.log(file);
console.log("api/media:", [...new Set(media)]);
console.log("uploads:", [...new Set(uploads)].slice(0, 5));
const idx = h.indexOf('"images":');
console.log("images json:", idx >= 0 ? h.slice(idx, idx + 400) : "none");
