/**
 * Tek kaynak sosyal/profil bağlantıları.
 *
 * `seo.organizationSameAs` içindeki URL'ler hem footer ikonlarını hem de
 * schema.org Organization `sameAs` alanını besler. Platform, URL'nin host
 * kısmından otomatik algılanır; bilinmeyenler genel "web" ikonu alır.
 *
 * Client-safe: node modülü import etmez (mirror overlay client'tan da kullanılır).
 */

export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "youtube"
  | "tiktok"
  | "x"
  | "pinterest"
  | "linkedin"
  | "whatsapp"
  | "website";

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
  label: string;
};

const MATCHERS: { platform: SocialPlatform; label: string; test: RegExp }[] = [
  { platform: "instagram", label: "Instagram", test: /(^|\.)instagram\.com/i },
  { platform: "facebook", label: "Facebook", test: /(^|\.)(facebook\.com|fb\.com|fb\.me)/i },
  { platform: "youtube", label: "YouTube", test: /(^|\.)(youtube\.com|youtu\.be)/i },
  { platform: "tiktok", label: "TikTok", test: /(^|\.)tiktok\.com/i },
  { platform: "x", label: "X (Twitter)", test: /(^|\.)(x\.com|twitter\.com)/i },
  { platform: "pinterest", label: "Pinterest", test: /(^|\.)pinterest\./i },
  { platform: "linkedin", label: "LinkedIn", test: /(^|\.)linkedin\.com/i },
  { platform: "whatsapp", label: "WhatsApp", test: /(^|\.)(wa\.me|whatsapp\.com)/i },
];

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

/**
 * Satırlardan http(s) URL'lerini ayıklar. "Instagram: https://..." gibi
 * etiketli girişleri de tolere eder; sondaki noktalama temizlenir.
 */
export function extractUrls(lines: string[] | null | undefined): string[] {
  if (!Array.isArray(lines)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const text = (raw ?? "").trim();
    if (!text) continue;
    const match = text.match(/https?:\/\/[^\s]+/i);
    if (!match) continue;
    const url = match[0].replace(/[)\]>,.;'"]+$/, "");
    if (!/^https?:\/\//i.test(url)) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

/** URL listesinden algılanmış, tekrarsız sosyal bağlantılar üretir. */
export function detectSocialLinks(urls: string[] | null | undefined): SocialLink[] {
  const out: SocialLink[] = [];
  for (const url of extractUrls(urls)) {
    const host = hostOf(url);
    const match = MATCHERS.find((m) => m.test.test(host));
    out.push({
      platform: match?.platform ?? "website",
      url,
      label: match?.label ?? (host.replace(/^www\./, "") || "Web"),
    });
  }
  return out;
}

/** 24x24 viewBox SVG gövdeleri — fill/stroke currentColor ile tema rengine uyar. */
const ICONS: Record<SocialPlatform, string> = {
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/>',
  facebook:
    '<path fill="currentColor" d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/>',
  youtube:
    '<path fill="currentColor" d="M23 12s0-3.2-.4-4.7c-.2-.8-.9-1.5-1.7-1.7C19.4 5.2 12 5.2 12 5.2s-7.4 0-8.9.4c-.8.2-1.5.9-1.7 1.7C1 8.8 1 12 1 12s0 3.2.4 4.7c.2.8.9 1.5 1.7 1.7 1.5.4 8.9.4 8.9.4s7.4 0 8.9-.4c.8-.2 1.5-.9 1.7-1.7.4-1.5.4-4.7.4-4.7zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z"/>',
  tiktok:
    '<path fill="currentColor" d="M16.5 3c.3 2.1 1.6 3.7 3.7 3.9v2.4c-1.3.1-2.5-.3-3.7-1v6.1c0 3.3-2.4 5.6-5.4 5.6-2.8 0-5-2.1-5-4.9 0-3 2.5-5.2 5.8-4.7v2.5c-.4-.1-.8-.2-1.2-.2-1.3 0-2.3 1-2.3 2.3 0 1.4 1 2.4 2.4 2.4 1.5 0 2.5-1.1 2.5-2.8V3h2.9z"/>',
  x: '<path fill="currentColor" d="M18.2 2H21l-6.5 7.4L22 22h-6.2l-4.8-6.3L5.5 22H2.7l7-8L2 2h6.3l4.3 5.7L18.2 2zm-2.2 18h1.6L7.9 3.8H6.2L16 20z"/>',
  pinterest:
    '<path fill="currentColor" d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.6 1.3 1.4 0 .9-.5 2.1-.8 3.3-.2 1 .5 1.8 1.5 1.8 1.8 0 3-2.3 3-5 0-2.1-1.4-3.6-3.9-3.6-2.9 0-4.6 2.1-4.6 4.5 0 .8.2 1.4.6 1.8.2.2.2.3.1.5l-.2.9c-.1.3-.3.4-.6.2-1.1-.5-1.7-1.8-1.7-3.4 0-2.7 2.3-6 6.8-6 3.6 0 6 2.6 6 5.4 0 3.7-2.1 6.5-5.1 6.5-1 0-2-.5-2.3-1.2l-.6 2.4c-.2.8-.7 1.8-1.1 2.5A10 10 0 1 0 12 2z"/>',
  linkedin:
    '<path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-.9 1.8-1.9 3.6-1.9 3.9 0 4.6 2.5 4.6 5.8V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21H9z"/>',
  whatsapp:
    '<path fill="currentColor" d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 6.7 12.4l-.3.5.6 2.2-2.3-.6-.5.3A8 8 0 1 1 12 4zm-3 4c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.7 4.2 3.7 2.1.8 2.5.7 2.9.6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.7-.4c-.4-.2-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1l-.6.8c-.1.1-.3.2-.5.1-.3-.1-1.1-.4-2-1.2-.7-.6-1.2-1.4-1.4-1.7-.1-.2 0-.4.1-.5l.4-.4c.1-.1.1-.3.2-.4 0-.2 0-.3 0-.4l-.7-1.7c-.2-.4-.3-.4-.5-.4H9z"/>',
  website:
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
};

export function socialIconSvg(platform: SocialPlatform): string {
  const body = ICONS[platform] ?? ICONS.website;
  return `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">${body}</svg>`;
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

const ANCHOR_STYLE =
  "display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:9999px;border:1px solid currentColor;color:inherit;text-decoration:none;opacity:.8;margin:4px 10px 4px 0";

/** Tek bir sosyal bağlantı için <a> (mirror enjeksiyonu ve client overlay ortak). */
export function socialLinkAnchorHtml(link: SocialLink): string {
  const url = escAttr(link.url);
  const label = escAttr(link.label);
  return `<a href="${url}" target="_blank" rel="noopener noreferrer me" aria-label="${label}" title="${label}" class="kn-social-link" style="${ANCHOR_STYLE}">${socialIconSvg(link.platform)}</a>`;
}

/** Footer'daki `.footer--social-links` kutusuna yazılacak ikon satırı. */
export function socialLinksRowHtml(links: SocialLink[]): string {
  if (!links.length) return "";
  return `<div class="kn-social-row" style="display:flex;flex-wrap:wrap;align-items:center">${links
    .map(socialLinkAnchorHtml)
    .join("")}</div>`;
}
