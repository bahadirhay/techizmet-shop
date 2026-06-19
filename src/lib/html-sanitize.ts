import DOMPurify from "isomorphic-dompurify";

const EMBED_HOST_RE =
  /^(?:www\.)?(instagram\.com|youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)$/i;

let hooksReady = false;

function ensureSanitizeHooks() {
  if (hooksReady) return;
  hooksReady = true;

  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName !== "iframe" || !(node instanceof Element)) return;
    const src = node.getAttribute("src")?.trim() ?? "";
    if (!src) {
      node.remove();
      return;
    }
    try {
      const host = new URL(src, "https://local.invalid").hostname.replace(/^www\./, "");
      if (!EMBED_HOST_RE.test(host)) node.remove();
    } catch {
      node.remove();
    }
  });
}

const PUBLIC_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "figure",
  "figcaption",
  "span",
  "div",
  "hr",
  "sup",
  "sub",
  "pre",
  "code",
  "video",
  "source",
  "iframe",
] as const;

const PUBLIC_ATTR = [
  "href",
  "title",
  "alt",
  "src",
  "width",
  "height",
  "class",
  "style",
  "target",
  "rel",
  "colspan",
  "rowspan",
  "allow",
  "allowfullscreen",
  "frameborder",
  "loading",
  "controls",
  "playsinline",
  "muted",
  "loop",
  "preload",
  "type",
] as const;

/** Ürün açıklaması, CMS blokları, yasal metin önizleme */
export function sanitizePublicHtml(html: string): string {
  if (!html?.trim()) return "";
  ensureSanitizeHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...PUBLIC_TAGS],
    ALLOWED_ATTR: [...PUBLIC_ATTR],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "form", "input", "object", "embed"],
  });
}

/** SEO doğrulama — yalnızca link/meta (script yok) */
export function sanitizeStaffHeadHtml(html: string): string {
  if (!html?.trim()) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["link", "meta", "noscript"],
    ALLOWED_ATTR: [
      "rel",
      "href",
      "type",
      "content",
      "name",
      "property",
      "charset",
      "crossorigin",
      "integrity",
      "as",
      "sizes",
    ],
    ALLOW_DATA_ATTR: false,
  });
}

export { escapePublicHtmlText } from "@/lib/html-escape";
