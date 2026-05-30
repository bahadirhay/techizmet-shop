/**
 * *-tr.html dosyalarında kalan İngilizce benzeri metinleri listeler.
 * Kullanım: node scripts/scan-mirror-tr-english.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "public/theme/king-noor/mirror");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith("-tr.html")) acc.push(p);
  }
  return acc;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

const enHint =
  /\b(the|and|with|your|for|our|skin|beauty|product|cream|collection|natural|glow|hydrat|moistur|vitamin|ingredient|unleash|reveal|customer|feedback|explore|view detail|shop now|learn more|after using|these products)\b/i;

const seen = new Set();
const files = walk(ROOT);

for (const file of files) {
  const rel = relative(process.cwd(), file);
  const text = stripHtml(readFileSync(file, "utf8"));
  const chunks = text.split(/(?<=[.!?])\s+/);
  for (const chunk of chunks) {
    const t = chunk.trim();
    if (t.length < 25 || t.length > 500) continue;
    if (!/[a-zA-Z]{4,}/.test(t)) continue;
    if (!enHint.test(t)) continue;
    if (/[ğüşöçıİĞÜŞÖÇ]/.test(t)) continue;
    const key = t.slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`\n[${rel}]\n${t.slice(0, 200)}${t.length > 200 ? "…" : ""}`);
  }
}

console.log(`\n--- Toplam ${seen.size} benzersiz İngilizce benzeri parça ---`);
