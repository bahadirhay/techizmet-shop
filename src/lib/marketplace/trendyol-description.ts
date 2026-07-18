import {
  decodeHtmlEntities,
  sanitizeMarketplacePlainText,
} from "@/lib/html-plain-text";

/**
 * Trendyol onaylı ürün açıklaması (HTML).
 *
 * QC (update-audits):
 * - `&` REDUNDANT_CHARACTERS riski → metinde ` ve `
 * - description img yalnızca cdn.dsmcdn.com / doğrudan görsel; /api/media reddedilir
 */
export function toTrendyolDescriptionHtml(input: {
  description?: string | null;
  descriptionHtml?: string | null;
  imageUrl?: string | null;
}): string {
  const rawHtml = (input.descriptionHtml ?? "").trim();
  const rawPlain = (input.description ?? "").trim();

  let html: string;
  if (rawHtml && /<[a-z][\s\S]*>/i.test(rawHtml)) {
    html = sanitizeTrendyolHtmlFragment(rawHtml);
  } else {
    const plain = sanitizeForTrendyolPlain(rawPlain || rawHtml);
    html = plainToSafeHtmlParagraphs(plain);
  }

  if (html.length < 4000) {
    const img = toTrendyolEmbeddableImageUrl(input.imageUrl);
    if (img && !/<img\b/i.test(html)) {
      html += `<br/><img src="${escapeAttr(img)}" alt=""/>`;
    }
  }

  return html.slice(0, 30000) || "<p>-</p>";
}

/** Trendyol QC: & → " ve " */
export function sanitizeForTrendyolPlain(text: string): string {
  let s = sanitizeMarketplacePlainText(text);
  s = s.replace(/&amp;/gi, " ve ").replace(/&/g, " ve ");
  return s.replace(/\s{2,}/g, " ").trim();
}

function escapeAttr(url: string): string {
  return url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** Description içine gömülebilir mi? */
export function toTrendyolEmbeddableImageUrl(url: string | null | undefined): string | null {
  const u = (url ?? "").trim();
  if (!u || !/^https:\/\//i.test(u)) return null;
  if (/\/api\/media\//i.test(u)) return null;
  if (/cdn\.dsmcdn\.com/i.test(u)) return u;
  if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)) return u;
  return null;
}

function plainToSafeHtmlParagraphs(plain: string): string {
  if (!plain) return "<p>-</p>";
  const escaped = plain.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paras = escaped
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length <= 1) {
    return `<p>${escaped.replace(/\n/g, "<br/>")}</p>`;
  }
  return paras.map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
}

export function sanitizeTrendyolHtmlFragment(html: string): string {
  let h = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  h = decodeHtmlEntities(h);
  h = h.replace(/<img\b[^>]*\/api\/media\/[^>]*>/gi, "");
  // Etiket dışı metindeki &amp; / & → ve
  h = h.replace(/(^|>)([^<]*)/g, (_m, open: string, text: string) => {
    const fixed = text.replace(/&amp;/gi, " ve ").replace(/&/g, " ve ").replace(/\s{2,}/g, " ");
    return `${open}${fixed}`;
  });
  return h.trim();
}
