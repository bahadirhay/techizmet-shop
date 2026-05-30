/** Admin: düz metin — Vitrin: mirror accordion HTML */

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Mirror / DB HTML → admin textarea (etiketsiz düz metin) */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html?.trim()) return "";
  let s = html;
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n");
  s = s.replace(/<\/div>\s*<div[^>]*>/gi, "\n\n");
  s = s.replace(/<[^>]+>/g, "");
  return decodeEntities(s).replace(/\n{3,}/g, "\n\n").trim();
}

export function plainToDescriptionHtml(plain: string): string {
  const t = plain.trim();
  if (!t) return "";
  const paras = t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paras.length <= 1) return `<p>${escapeHtml(paras[0] ?? t)}</p>`;
  return paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
}

export function plainToAccordionHtml(plain: string): string {
  const t = plain.trim();
  if (!t) return "";
  const inner = escapeHtml(t).replace(/\n/g, "<br />\n");
  return `<p><span class="metafield-multi_line_text_field">${inner}</span></p>`;
}

/** Vitrin overlay: DB düz metin veya HTML */
export function contentForVitrinAccordion(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  return plainToAccordionHtml(value);
}

export function contentForVitrinDescription(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  return plainToDescriptionHtml(value);
}
