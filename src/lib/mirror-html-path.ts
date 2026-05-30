import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const mirrorRoot = () => join(process.cwd(), "public/theme/king-noor/mirror");
const productRoot = () => join(mirrorRoot(), "products");
const collectionRoot = () => join(mirrorRoot(), "collections");

export function mirrorProductHtmlExists(slug: string) {
  return existsSync(join(productRoot(), `${slug}.html`));
}

export function mirrorCollectionHtmlExists(slug: string) {
  return existsSync(join(collectionRoot(), `${slug}.html`));
}

/** Yeni admin koleksiyonları için uygun bir detail şablonu seç */
export function resolveMirrorCollectionTemplateSlug(slug: string): string | null {
  if (mirrorCollectionHtmlExists(slug)) return slug;

  for (const preferred of [
    "facial-boosters",
    "glow-essentials",
    "luxe-skincare",
    "moisture-magic",
    "natural-glam",
    "pure-by-nature",
  ]) {
    if (mirrorCollectionHtmlExists(preferred)) return preferred;
  }

  try {
    const first = readdirSync(collectionRoot())
      .find((name) => name.endsWith(".html") && !name.endsWith("-tr.html") && name !== "all.html" && name !== "index.html");
    return first ? first.replace(/\.html$/i, "") : null;
  } catch {
    return null;
  }
}

/** Yeni admin ürünleri için uygun bir PDP şablonu seç */
export function resolveMirrorProductTemplateSlug(slug: string): string | null {
  if (mirrorProductHtmlExists(slug)) return slug;

  for (const preferred of [
    "spectrum-sunscreen-spf-50",
    "micro-sculpting-moisturizer",
    "hydrasoft-face-moisturizer",
    "hydrasilk-skin-reviving-cleanser",
    "vitamin-c-hyaluronic-acid-radiant-serum",
  ]) {
    if (mirrorProductHtmlExists(preferred)) return preferred;
  }

  try {
    const first = readdirSync(productRoot())
      .find((name) => name.endsWith(".html") && !name.endsWith("-tr.html") && name !== "index.html");
    return first ? first.replace(/\.html$/i, "") : null;
  } catch {
    return null;
  }
}

export function mirrorStaticPageHtmlExists(slug: string) {
  return existsSync(join(mirrorRoot(), "pages", `${slug}.html`));
}

const blogNewsRoot = () => join(mirrorRoot(), "blogs/news");

export function mirrorBlogListHtmlExists() {
  return existsSync(join(blogNewsRoot(), "index.html"));
}

export function mirrorBlogArticleHtmlExists(slug: string) {
  return existsSync(join(blogNewsRoot(), `${slug}.html`));
}

/** Yazı şablonu — ilk mevcut makale HTML'i */
export function resolveMirrorBlogArticleTemplateSlug(slug: string): string | null {
  if (mirrorBlogArticleHtmlExists(slug)) return slug;
  try {
    const first = readdirSync(blogNewsRoot()).find(
      (name) =>
        name.endsWith(".html") &&
        !name.endsWith("-tr.html") &&
        name !== "index.html" &&
        name !== "index-tr.html",
    );
    return first ? first.replace(/\.html$/i, "") : null;
  } catch {
    return null;
  }
}
