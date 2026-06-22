/** Blog kart HTML parçalama — son karttan sonraki footer / script korunur */

export const BLOG_ITEM_OPEN_TOKEN = "<div class=\"blog--item";

/** Mirror şablonundaki kırık kart etiketlerini düzelt */
export function normalizeBlogItemHtml(html: string): string {
  return html
    .replace(/<div\s+[\r\n\s]+class="blog--item/gi, "<div class=\"blog--item")
    .replace(/<\/div>\s*class="blog--item/gi, "</div><div class=\"blog--item")
    // blog--content kapanışından sonra dış blog--item </div> eksikse ekle
    .replace(/<\/div><div class="blog--item/gi, "</div></div><div class=\"blog--item");
}

export function truncateBlogItemChunk(chunk: string): { item: string; suffix: string } {
  const m = chunk.match(
    /^([\s\S]*?<div class="blog--content">[\s\S]*?<\/div>\s*\n?\s*<\/div>)([\s\S]*)$/i,
  );
  if (m) return { item: m[1]!, suffix: m[2]! };
  return { item: chunk, suffix: "" };
}

export type BlogItemHtmlParts = {
  prefix: string;
  items: string[];
  suffix: string;
};

export function splitBlogItemHtmlParts(html: string): BlogItemHtmlParts {
  const parts = normalizeBlogItemHtml(html).split(BLOG_ITEM_OPEN_TOKEN);
  const prefix = parts[0] ?? "";
  if (parts.length < 2) {
    return { prefix: html, items: [], suffix: "" };
  }

  const items: string[] = [];
  for (let i = 1; i < parts.length - 1; i++) {
    items.push(parts[i]!);
  }

  const { item, suffix } = truncateBlogItemChunk(parts[parts.length - 1] ?? "");
  items.push(item);
  return { prefix, items, suffix };
}

/** Yalnızca blog görsel / başlık linkleri — global href değiştirme footer’ı bozar */
export function patchBlogLinksInChunk(
  chunk: string,
  href: string,
  openInNewTab = false,
): string {
  const safe = href.replace(/"/g, "&quot;");
  const tabAttrs = openInNewTab ? ` target="_blank" rel="noopener noreferrer"` : "";
  let out = chunk;
  out = out.replace(
    /(<a[^>]*class="[^"]*blog--(?:image|title)[^"]*"[^>]*href=")[^"]*(")/gi,
    `$1${safe}$2${tabAttrs}`,
  );
  out = out.replace(
    /(<a[^>]*href=")[^"]*("[^>]*class="[^"]*blog--(?:image|title)[^"]*")/gi,
    `$1${safe}$2${tabAttrs}`,
  );
  return out;
}

export function reassembleBlogItemHtml(prefix: string, items: string[], suffix: string): string {
  return prefix + items.map((item) => BLOG_ITEM_OPEN_TOKEN + item).join("") + suffix;
}
