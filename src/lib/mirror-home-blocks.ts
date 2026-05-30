import { nanoid } from "nanoid";
import type { ShopBlock } from "@/lib/blocks/schema";
import { buildStoreHomePreset } from "@/lib/blocks/presets/techizmet-shop-home";
import { readMirrorHomeHtml } from "@/lib/mirror-home-html";

const nid = () => nanoid(8);

function stripTags(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAssetUrl(raw: string) {
  const u = raw.split("?")[0].trim();
  if (u.startsWith("/theme/")) return u;
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

function firstMatch(html: string, re: RegExp) {
  const m = html.match(re);
  return m?.[1]?.trim() ?? null;
}

function allMatches(html: string, re: RegExp) {
  return [...html.matchAll(re)].map((m) => m.slice(1));
}

function headingPlain(html: string) {
  return stripTags(html.replace(/<span[^>]*class="[^"]*markers-text[^"]*"[^>]*>/gi, "").replace(/<\/span>/gi, ""));
}

function extractMainContent(html: string) {
  const start = html.indexOf('id="MainContent"');
  const end = html.indexOf("</main>", start > -1 ? start : 0);
  if (start < 0 || end < start) return html;
  return html.slice(start, end);
}

function extractAnnouncement(main: string): ShopBlock | null {
  const item = firstMatch(
    main,
    /announcement-bar--item[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i,
  );
  if (!item) return null;
  const link = firstMatch(item, /<a[^>]+href="([^"]+)"[^>]*>([^<]*)</i);
  const text = stripTags(item.replace(/<a[\s\S]*?<\/a>/gi, "").trim());
  if (!text) return null;
  return {
    type: "announcementBar",
    props: {
      text,
      linkHref: link?.[0] ? link[0].replace(/\.html$/i, "") : undefined,
      linkLabel: link?.[1] ? stripTags(link[1]) : undefined,
    },
  };
}

function extractHeroSlider(main: string): ShopBlock | null {
  const gridStart = main.indexOf("section-media-grid");
  const chunk = gridStart >= 0 ? main.slice(gridStart, gridStart + 150000) : main.slice(0, 120000);

  type Slide = Extract<ShopBlock, { type: "heroSlider" }>["props"]["slides"][number];
  const flatSlides: Slide[] = [];
  const seen = new Set<string>();

  const itemRe = /<(?:a|div)[^>]*class="media-grid--item[\s\S]*?(?=<(?:a|div)[^>]*class="media-grid--item|$)/gi;
  for (const item of chunk.match(itemRe) ?? []) {
    const imageRaw =
      firstMatch(item, /data-original="(\/theme\/techizmet-shop\/[^"]+)"/i) ||
      firstMatch(item, /src="(\/theme\/techizmet-shop\/cdn\/shop\/files\/MG[^"?]+)/i);
    if (!imageRaw) continue;
    const imageUrl = normalizeAssetUrl(imageRaw);
    if (seen.has(imageUrl)) continue;
    seen.add(imageUrl);

    const headlineRaw = firstMatch(item, /media-content-heading[^>]*>([\s\S]*?)<\/h[1-6]/i);
    const descRaw = firstMatch(item, /media-content-description[^>]*>([\s\S]*?)<\/div>/i);
    const href = firstMatch(item, /<a[^>]+href="([^"]+)"/i);

    flatSlides.push({
      id: nid(),
      imageUrl,
      headline: headlineRaw ? headingPlain(headlineRaw) : "Techizmet Shop",
      subline: descRaw ? stripTags(descRaw) : undefined,
      ctaLabel: "Keşfet",
      ctaHref: href ? href.replace(/\.html$/i, "") : "/collections/all",
    });
    if (flatSlides.length >= 4) break;
  }

  if (flatSlides.length === 0) {
    for (const [url] of allMatches(chunk, /data-original="(\/theme\/techizmet-shop\/cdn\/shop\/files\/MG[^"]+)"/gi)) {
      const imageUrl = normalizeAssetUrl(url);
      if (seen.has(imageUrl)) continue;
      seen.add(imageUrl);
      flatSlides.push({
        id: nid(),
        imageUrl,
        headline: "Techizmet Shop",
        ctaLabel: "Keşfet",
        ctaHref: "/collections/all",
      });
      if (flatSlides.length >= 4) break;
    }
  }

  if (!flatSlides.length) return null;
  return { type: "heroSlider", props: { autoplayMs: 6000, slides: flatSlides } };
}

function extractScrollingCollections(main: string): ShopBlock | null {
  const chunk = firstMatch(main, /(section-scrolling-collections[\s\S]*?)<\/section>/i);
  if (!chunk) return null;
  const items: Extract<ShopBlock, { type: "collectionGrid" }>["props"]["items"] = [];
  const cardRe =
    /scrolling-collection-card[\s\S]*?href="(\/collections\/[^"]+)"[\s\S]*?data-original="([^"]+)"[\s\S]*?scrolling-collection--title[^>]*>\s*([^<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(chunk)) && items.length < 8) {
    const href = m[1].replace(/\.html$/i, "");
    if (items.some((i) => i.href === href)) continue;
    const countM = chunk.slice(m.index, m.index + 800).match(/scrolling-collection--count[^>]*>\s*(\d+)/i);
    items.push({
      id: nid(),
      title: stripTags(m[3]),
      href,
      imageUrl: normalizeAssetUrl(m[2]),
      productCount: countM ? Number(countM[1]) : undefined,
    });
  }
  if (!items.length) return null;
  return {
    type: "collectionGrid",
    props: { title: "Koleksiyonlar", items },
  };
}

function extractProductSection(main: string, sectionClass: string, defaultTitle: string): ShopBlock | null {
  const re = new RegExp(
    `section-${sectionClass}[\\s\\S]*?section--heading[^>]*>([\\s\\S]*?)<\\/h[1-6]>[\\s\\S]*?(?:href="\\/collections\\/([^"]+)"|href="\\/products\\/([^"]+))`,
    "i",
  );
  const m = main.match(re);
  if (!m) return null;
  const title = headingPlain(m[1]) || defaultTitle;
  const collectionSlug = (m[2] || m[3] || "").replace(/\.html$/i, "").split("/").pop() || undefined;
  return {
    type: "productGrid",
    props: {
      title,
      limit: 8,
      collectionSlug: collectionSlug && !collectionSlug.includes(".") ? collectionSlug : undefined,
    },
  };
}

function extractFeaturedCollections(main: string): ShopBlock[] {
  const blocks: ShopBlock[] = [];
  const re =
    /section-featured-collection[\s\S]*?section--heading[^>]*>([\s\S]*?)<\/h[1-6]/gi;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(main)) && n < 3) {
    const section = main.slice(m.index, m.index + 12000);
    const slug =
      firstMatch(section, /href="\/collections\/([^".]+)/i) ??
      firstMatch(section, /href="\/products\/([^".]+)/i);
    blocks.push({
      type: "productGrid",
      props: {
        title: headingPlain(m[1]),
        limit: 8,
        collectionSlug: slug?.replace(/\.html$/i, ""),
      },
    });
    n++;
  }
  return blocks;
}

function extractTestimonials(main: string): ShopBlock | null {
  const chunk = firstMatch(main, /(section-testimonial[\s\S]*?)<\/section>/i);
  if (!chunk) return null;
  const titleM = chunk.match(/section--heading[^>]*>([\s\S]*?)<\/h[1-6]/i);
  const items: Extract<ShopBlock, { type: "testimonials" }>["props"]["items"] = [];
  const cardRe =
    /testimonial--item[\s\S]*?testimonial--author[^>]*>([^<]+)<[\s\S]*?testimonial--review[^>]*>([\s\S]*?)<\/div>/gi;
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(chunk)) && items.length < 6) {
    const quote = stripTags(m[2]);
    if (!quote) continue;
    items.push({ id: nid(), name: stripTags(m[1]), quote });
  }
  if (!items.length) return null;
  return {
    type: "testimonials",
    props: {
      title: titleM ? headingPlain(titleM[1]) : "Müşteri yorumları",
      items,
    },
  };
}

function extractMarquee(main: string): ShopBlock | null {
  const text = firstMatch(main, /section-marquee[\s\S]*?marquee-text[^>]*>[\s\S]*?<span[^>]*>([^<]+)</i);
  if (!text) return null;
  return { type: "promoMarquee", props: { text: stripTags(text) } };
}

function extractImageWithText(main: string): ShopBlock | null {
  const chunk = firstMatch(main, /(section-image-with-text[\s\S]*?)<\/section>/i);
  if (!chunk) return null;
  const imageUrl = firstMatch(chunk, /data-original="(\/theme\/techizmet-shop\/[^"]+)"/i);
  const title = firstMatch(chunk, /image-with-text--heading[^>]*>([\s\S]*?)<\/h[1-6]/i);
  const body = firstMatch(chunk, /image-with-text--desc[^>]*>([\s\S]*?)<\/div>/i);
  const cta = firstMatch(chunk, /<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?button--text[^>]*>([^<]+)</i);
  if (!imageUrl || !title) return null;
  return {
    type: "imageTextSplit",
    props: {
      imageUrl: normalizeAssetUrl(imageUrl),
      title: headingPlain(title),
      body: body ? stripTags(body) : "",
      ctaLabel: cta?.[1] ? stripTags(cta[1]) : undefined,
      ctaHref: cta?.[0] ? cta[0].replace(/\.html$/i, "") : undefined,
      imagePosition: chunk.includes("image--position-right") ? "right" : "left",
    },
  };
}

/** Techizmet Shop mirror index.html → sürükle-bırak blokları */
export function extractMirrorHomeBlocks(html: string): ShopBlock[] {
  const main = extractMainContent(html);
  const blocks: ShopBlock[] = [];

  const announcement = extractAnnouncement(main);
  if (announcement) blocks.push(announcement);

  const hero = extractHeroSlider(main);
  if (hero) blocks.push(hero);

  const collections = extractScrollingCollections(main);
  if (collections) blocks.push(collections);

  blocks.push(...extractFeaturedCollections(main));

  const trending = extractProductSection(main, "trending-products", "Trend ürünler");
  if (trending) blocks.push(trending);

  const testimonials = extractTestimonials(main);
  if (testimonials) blocks.push(testimonials);

  const best = extractProductSection(main, "best-selling-products", "Çok satanlar");
  if (best) blocks.push(best);

  const imageText = extractImageWithText(main);
  if (imageText) blocks.push(imageText);

  const marquee = extractMarquee(main);
  if (marquee) blocks.push(marquee);

  if (blocks.length < 4) {
    return buildStoreHomePreset("tr");
  }

  const hasNewsletter = blocks.some((b) => b.type === "newsletter");
  if (!hasNewsletter) {
    blocks.push({
      type: "newsletter",
      props: {
        title: "Bültene katılın",
        subtitle: "Kampanya ve yeni ürünlerden haberdar olun.",
        buttonLabel: "Kaydol",
      },
    });
  }

  return blocks;
}

export function loadMirrorHomeBlocks(): ShopBlock[] {
  const html = readMirrorHomeHtml();
  if (!html) return buildStoreHomePreset("tr");
  return extractMirrorHomeBlocks(html);
}
