/** Admin metin kutuları — HTML yerine satır sonları */

const ENTITY: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeHtmlEntities(s: string): string {
  return s.replace(/&(#\d+|#x[\da-fA-F]+|\w+);/g, (_, ent: string) => {
    if (ent[0] === "#") {
      const code = ent[1] === "x" ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    }
    return ENTITY[ent] ?? _;
  });
}

/** Vitrindeki HTML → düzenleme kutusunda düz metin */
export function htmlToPlainText(html: string): string {
  if (!html?.trim()) return "";
  let s = html.replace(/\r\n/g, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/p>\s*/gi, "\n\n");
  s = s.replace(/<p[^>]*>/gi, "");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeHtmlEntities(s);
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Düz metin → vitrinde satır kırılımı (basit &lt;br /&gt;) */
export function plainTextToSimpleHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const paragraphs = normalized.split(/\n\n+/);
  if (paragraphs.length <= 1) {
    return normalized
      .split("\n")
      .map((line) => escapeHtml(line))
      .join("<br />\n");
  }

  return paragraphs
    .map((p) => {
      const inner = p
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br />\n");
      return `<p>${inner}</p>`;
    })
    .join("\n");
}

/** Vurgulu span vb. — düz metne çevirince kaybolur */
export function isComplexHtml(html: string): boolean {
  if (!html?.trim()) return false;
  return (
    /<(div|ul|ol|table|iframe|script|style)\b/i.test(html) ||
    /markers-text|class="[^"]*marker/i.test(html)
  );
}

const MARKERS_ACCENT_SPAN =
  '<span class="markers-text accent-font no-markers">';

/** Düz metin — *vurgu* → tema span (ürün sayfası kayan yazı / video başlığı) */
export function plainTextToMarkedHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  return normalized
    .split(/(\*[^*\n]+\*)/g)
    .map((part) => {
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return `${MARKERS_ACCENT_SPAN}${escapeHtml(part.slice(1, -1))}</span>`;
      }
      return escapeHtml(part);
    })
    .join("");
}

/** Vitrin HTML → admin düzenleme kutusu (*vurgu* ile) */
export function markedHtmlToPlainText(html: string): string {
  if (!html?.trim()) return "";
  let s = html.replace(
    /<span[^>]*class="[^"]*markers-text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    (_, inner: string) => `*${htmlToPlainText(inner)}*`,
  );
  return htmlToPlainText(s);
}
