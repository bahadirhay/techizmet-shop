import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { htmlToPlainText } from "@/lib/product-content-format";

const themeRoot = join(process.cwd(), "public/theme/king-noor");
const mirrorRoot =
  process.env.THEME_MIRROR_PATH?.trim() || "C:/My Web Sites/shop/theking-noor.myshopify.com";
const httrackProductsDir = join(mirrorRoot, "en-us/products");
const builtProductsDir = join(themeRoot, "mirror/products");

export type MirrorProductContent = {
  description: string | null;
  descriptionHtml: string | null;
  keyFeaturesHtml: string | null;
  howToUseHtml: string | null;
  handle: string | null;
};

export function readMirrorProductHtml(slug: string): string | null {
  const built = join(builtProductsDir, `${slug}.html`);
  if (existsSync(built)) return readFileSync(built, "utf8");
  const src = join(httrackProductsDir, `${slug}.html`);
  if (existsSync(src)) return readFileSync(src, "utf8");
  return null;
}

function htmlToPlain(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractAccordionBody(html: string, heading: string) {
  const re = new RegExp(
    `product-accordion--heading-text h6">${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>[\\s\\S]*?product-accordion--content-body rte">([\\s\\S]*?)</div>\\s*</div>\\s*</details>`,
    "i",
  );
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function extractProductHandle(html: string): string | null {
  const m = html.match(/var meta = (\{[\s\S]*?\});/);
  if (!m) return null;
  try {
    const meta = JSON.parse(m[1]) as { product?: { handle?: string } };
    return meta.product?.handle ?? null;
  } catch {
    return null;
  }
}

function extractShortDescription(html: string) {
  const m = html.match(/class="product--description[^"]*"[^>]*>\s*([^<]+)/i);
  if (m) return m[1].trim();
  const descHtml = extractAccordionBody(html, "Description");
  if (descHtml) return htmlToPlain(descHtml).slice(0, 500);
  const meta = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  return meta ? meta[1].trim() : null;
}

/** Vitrin mirror HTML ile birebir aynı PDP metinleri */
export function extractMirrorProductContent(html: string, expectedSlug?: string): MirrorProductContent {
  const handle = extractProductHandle(html);
  if (expectedSlug && handle && handle !== expectedSlug) {
    throw new Error(
      `Mirror HTML ürünü eşleşmiyor: beklenen "${expectedSlug}", dosyada "${handle}"`,
    );
  }

  const descriptionHtmlRaw = extractAccordionBody(html, "Description");
  const keyFeaturesRaw = extractAccordionBody(html, "Key Features");
  const howToUseRaw = extractAccordionBody(html, "How to Use");

  return {
    handle,
    description: extractShortDescription(html),
    descriptionHtml: htmlToPlainText(descriptionHtmlRaw),
    keyFeaturesHtml: htmlToPlainText(keyFeaturesRaw),
    howToUseHtml: htmlToPlainText(howToUseRaw),
  };
}

export function loadMirrorProductContent(slug: string): MirrorProductContent | null {
  const html = readMirrorProductHtml(slug);
  if (!html) return null;
  return extractMirrorProductContent(html, slug);
}
