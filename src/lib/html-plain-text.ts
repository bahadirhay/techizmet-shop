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
  let out = s;
  for (let i = 0; i < 5; i++) {
    const prev = out;
    out = out.replace(/&(#\d+|#[xX][\da-fA-F]+|\w+);/g, (_, ent: string) => {
      if (ent[0] === "#") {
        const code = ent[1] === "x" || ent[1] === "X" ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : _;
      }
      return ENTITY[ent.toLowerCase()] ?? _;
    });
    // Eksik noktalı virgüllü yaygın entity'ler: &amp &lt ...
    // `;` hariç — aksi halde &amp;amp; → &amp; sonrası &amp eşleşip &; olur.
    out = out.replace(/&(amp|lt|gt|quot|apos|nbsp)(?![a-zA-Z0-9;])/gi, (_, name: string) => {
      return ENTITY[name.toLowerCase()] ?? `&${name}`;
    });
    if (out === prev) break;
  }
  return out;
}

/**
 * Pazaryeri / düz metin: entity decode + etiket temizliği.
 * Çift encode (&amp;amp;) ve noktalı virgülsüz &amp durumlarını düzeltir.
 */
export function sanitizeMarketplacePlainText(text: string): string {
  if (!text?.trim()) return "";
  let s = text.replace(/\r\n/g, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/p>\s*/gi, "\n\n");
  s = s.replace(/<p[^>]*>/gi, "");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeHtmlEntities(s);
  return s.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
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

const MARKERS_OUTLINE_SPAN =
  '<span class="markers-text heading-font outline--filled">';

const MARKERS_MARQUEE_SOLID =
  '<span class="markers-text heading-font kn-marquee-solid">';

/** Düz metin — *vurgu* → tema span (ürün sayfası kayan yazı / video başlığı) */
export function plainTextToMarkedHtml(text: string): string {
  return plainTextToMarkerHtml(text, MARKERS_ACCENT_SPAN);
}

/**
 * Kayan indirim şeridi — *KOD* kontur; geri kalan düz okunur metin.
 * Örn: %20 indirim için *P-A-W-20* kodunu kullanabilirsiniz
 */
export function plainTextToOutlineMarkedHtml(text: string): string {
  return plainTextToMarqueeHtml(text);
}

export function plainTextToMarqueeHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  return normalized
    .split(/(\*[^*\n]+\*)/g)
    .map((part) => {
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return `${MARKERS_OUTLINE_SPAN}${escapeHtml(part.slice(1, -1).trim())}</span>`;
      }
      if (!part.trim()) return "";
      return `${MARKERS_MARQUEE_SOLID}${escapeHtml(part)}</span>`;
    })
    .join("");
}

function plainTextToMarkerHtml(text: string, openSpan: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  return normalized
    .split(/(\*[^*\n]+\*)/g)
    .map((part) => {
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return `${openSpan}${escapeHtml(part.slice(1, -1))}</span>`;
      }
      return escapeHtml(part);
    })
    .join("");
}

/** Vitrin HTML → admin düzenleme kutusu (*yalnızca vurgulu* kısımlar yıldızlı) */
export function markedHtmlToPlainText(html: string): string {
  if (!html?.trim()) return "";
  let s = html;
  s = s.replace(
    /<span[^>]*class="[^"]*outline--filled[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    (_, inner: string) => `*${htmlToPlainText(inner)}*`,
  );
  s = s.replace(
    /<span[^>]*class="[^"]*accent-font[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    (_, inner: string) => `*${htmlToPlainText(inner)}*`,
  );
  s = s.replace(
    /<span[^>]*class="[^"]*markers-text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    (_, inner: string) => htmlToPlainText(inner),
  );
  return htmlToPlainText(s);
}

/** Kayıtlı marquee düzenlemesi → düz metin (admin kutusu) */
export function marqueeEditToPlainText(
  edit: { text?: string; html?: string } | undefined,
  fallbackHtml = "",
): string {
  if (edit?.text != null) return edit.text;
  if (edit?.html?.trim()) return markedHtmlToPlainText(edit.html);
  if (fallbackHtml.trim()) return markedHtmlToPlainText(fallbackHtml);
  return "";
}

/** Düz metin → vitrin HTML (kayan şerit) */
export function marqueePlainToHtml(text: string): string {
  return plainTextToMarqueeHtml(text);
}
