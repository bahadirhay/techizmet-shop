import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Dynamic import of TS - use compiled approach: inline the check
const html = readFileSync(
  join(process.cwd(), "public/theme/techizmet-shop/mirror/index-tr.html"),
  "utf8",
);

// Mirror preserve + replace logic (minimal copy)
const MIRROR_TR_PAIRS = [
  ["Search", "Arama"],
  ["Suggestions", "Öneriler"],
];

function preserveNonTranslatable(html) {
  const chunks = [];
  const mark = (chunk) => {
    const i = chunks.length;
    chunks.push(chunk);
    return `\x00KNPRESERVE${i}\x00`;
  };
  let out = html;
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, mark);
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, mark);
  return { html: out, chunks };
}

function restorePreserved(html, chunks) {
  return html.replace(/\x00KNPRESERVE(\d+)\x00/g, (_, i) => chunks[Number(i)] ?? "");
}

const { html: protectedHtml, chunks } = preserveNonTranslatable(html);
let out = protectedHtml;
for (const [en, tr] of MIRROR_TR_PAIRS) {
  if (out.includes(en)) out = out.split(en).join(tr);
}
out = restorePreserved(out, chunks);

const issues = [];
if (out.includes("predictiveArama")) issues.push("predictiveArama in output");
if (out.includes("countrySelectorArama")) issues.push("countrySelectorArama in output");
if (out.includes("URLAramaParams")) issues.push("URLAramaParams in output");

console.log(issues.length ? issues.join("\n") : "No Search substring breaks in scripts");

// Find first script that broke
const idx = out.indexOf("predictiveArama");
if (idx >= 0) {
  console.log("context:", out.slice(idx - 80, idx + 80));
}
