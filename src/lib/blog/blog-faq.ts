import type { SearchIntentFaq } from "@/lib/seo/search-intent";
import { findFaqsForBlogSlug } from "@/lib/seo/search-intent";

/**
 * Body HTML içinden SSS çıkarır (h2 SSS + sonraki h3/soru + paragraf).
 * Şema yalnızca görünür içerikle hizalı kalsın diye kullanılır.
 */
export function extractFaqsFromBlogHtml(html: string): SearchIntentFaq[] {
  if (!html?.trim()) return [];
  const faqs: SearchIntentFaq[] = [];

  // <h2>…SSS…</h2> veya Sıkça Sorulan bölümünden sonraki blok
  const sectionMatch = html.match(
    /<h2[^>]*>[\s\S]*?(?:SSS|Sıkça\s+Sorulan|Sık\s+Sorulan|FAQ)[\s\S]*?<\/h2>([\s\S]*?)(?=<h2[\s>]|$)/i,
  );
  const section = sectionMatch?.[1] ?? html;

  // h3 soru + takip paragraf cevap
  const h3Re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*((?:<p[^>]*>[\s\S]*?<\/p>\s*)+)/gi;
  let m: RegExpExecArray | null;
  while ((m = h3Re.exec(section)) && faqs.length < 8) {
    const question = stripTags(m[1] ?? "").trim();
    const answer = stripTags(m[2] ?? "").trim();
    if (question.length >= 8 && answer.length >= 20) {
      faqs.push({ question, answer });
    }
  }

  if (faqs.length) return faqs;

  // <details><summary>Soru</summary>Cevap</details>
  const detailsRe = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
  while ((m = detailsRe.exec(html)) && faqs.length < 8) {
    const question = stripTags(m[1] ?? "").trim();
    const answer = stripTags(m[2] ?? "").trim();
    if (question.length >= 8 && answer.length >= 20) {
      faqs.push({ question, answer });
    }
  }

  return faqs;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Önce body SSS; yoksa slug eşlemesi.
 * `source`: şema için body'den geldiyse zaten görünür; map ise UI'da da basılmalı.
 */
export function resolveBlogFaqs(
  slug: string,
  bodyHtml: string,
): { faqs: SearchIntentFaq[]; renderVisible: boolean } {
  const fromBody = extractFaqsFromBlogHtml(bodyHtml);
  if (fromBody.length) return { faqs: fromBody, renderVisible: false };
  const fromMap = findFaqsForBlogSlug(slug);
  if (fromMap.length) return { faqs: fromMap, renderVisible: true };
  return { faqs: [], renderVisible: false };
}
