/** Blog kart HTML parçalama — son karttan sonraki footer / script korunur */

export const BLOG_ITEM_CLASS_TOKEN = 'class="blog--item';

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
  const parts = html.split(BLOG_ITEM_CLASS_TOKEN);
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
export function patchBlogLinksInChunk(chunk: string, href: string): string {
  const safe = href.replace(/"/g, "&quot;");
  let out = chunk;
  out = out.replace(
    /(<a[^>]*class="[^"]*blog--(?:image|title)[^"]*"[^>]*href=")[^"]*(")/gi,
    `$1${safe}$2`,
  );
  out = out.replace(
    /(<a[^>]*href=")[^"]*("[^>]*class="[^"]*blog--(?:image|title)[^"]*")/gi,
    `$1${safe}$2`,
  );
  return out;
}

export function reassembleBlogItemHtml(prefix: string, items: string[], suffix: string): string {
  return prefix + items.map((item) => BLOG_ITEM_CLASS_TOKEN + item).join("") + suffix;
}
