import {
  decodeHtmlEntities,
  escapeHtml,
  sanitizeMarketplacePlainText,
} from "@/lib/html-plain-text";

/** Trendyol description alanı HTML ister — çıplak & kesilir / &amp olarak görünür. */
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
    const plain = sanitizeMarketplacePlainText(rawPlain || rawHtml);
    html = plainToSafeHtmlParagraphs(plain);
  }

  // Trendyol: 4k altı açıklamada en az bir img önerilir
  if (html.length < 4000) {
    const img = toAbsoluteHttpsImage(input.imageUrl);
    if (img && !/<img\b/i.test(html)) {
      html += `<img src="${escapeHtml(img)}" alt=""/>`;
    }
  }

  return html.slice(0, 30000) || "<p>-</p>";
}

/** Relatif URL’ler atlanır — çağıran taraf absolute https vermeli. */
function toAbsoluteHttpsImage(url: string | null | undefined): string | null {
  const u = (url ?? "").trim();
  if (!u) return null;
  if (/^https:\/\//i.test(u)) return u;
  if (/^http:\/\//i.test(u)) return u.replace(/^http:\/\//i, "https://");
  return null;
}

function plainToSafeHtmlParagraphs(plain: string): string {
  if (!plain) return "<p>-</p>";
  const escaped = escapeHtml(plain);
  const paras = escaped.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paras.length <= 1) {
    return `<p>${escaped.replace(/\n/g, "<br/>")}</p>`;
  }
  return paras.map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
}

/** Mevcut HTML: script/style temizle, çıplak & → &amp; (çift encode etme). */
export function sanitizeTrendyolHtmlFragment(html: string): string {
  let h = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  h = decodeHtmlEntities(h);
  h = h.replace(/&(?!(#\d+|#[xX][\da-fA-F]+|\w+);)/g, "&amp;");
  return h.trim();
}
