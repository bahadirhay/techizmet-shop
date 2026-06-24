import "server-only";

import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { aiProductsFeedPath } from "@/lib/seo/ai-products-feed";
import { googleMerchantFeedPath } from "@/lib/seo/google-merchant-feed";
import { blogFeedUrl } from "@/lib/seo/rss-feed";
import type { SiteSettings } from "@/lib/site-settings";
import { getSiteSeo } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

function mdLink(title: string, url: string, description: string): string {
  return `- [${title}](${url}): ${description}`;
}

/** llmstxt.org — AI sistemleri için küratörlü site özeti */
export async function buildLlmsTxt(siteId: string, settings: SiteSettings, siteName: string): Promise<string> {
  const origin = getPublicSiteUrl();
  const seo = getSiteSeo(settings, siteName);
  const title = seo.siteTitle?.trim() || siteName;
  const summary =
    seo.metaDescription?.trim() ||
    "Doğal köpek ödül mamaları ve atıştırmalıkları — Türkiye'de online mağaza.";

  const [products, collections, blogPosts] = await Promise.all([
    prisma.storeProduct.findMany({
      where: { siteId, published: true },
      orderBy: { title: "asc" },
      take: 20,
      select: { slug: true, title: true, seoDescription: true, description: true },
    }),
    prisma.storeCollection.findMany({
      where: { siteId, published: true },
      orderBy: { title: "asc" },
      take: 12,
      select: { slug: true, title: true, description: true },
    }),
    prisma.storeBlogPost.findMany({
      where: { siteId, published: true },
      orderBy: { publishedAt: "desc" },
      take: 10,
      select: { slug: true, titleTr: true, excerptTr: true },
    }),
  ]);

  const lines: string[] = [
    `# ${title}`,
    "",
    `> ${summary}`,
    "",
    `${title}, evcil hayvan sahipleri için doğal içerikli köpek ödül mamaları satan bir e-ticaret mağazasıdır.`,
    "Ürün sayfalarında fiyat (TRY), stok, içerik ve kullanım bilgisi bulunur.",
    "Yapılandırılmış veri: Product schema, Google Merchant feed ve JSON ürün kataloğu.",
    "",
    "## Ana sayfalar",
    mdLink("Ana sayfa", `${origin}/`, "Mağaza vitrini ve öne çıkan ürünler"),
    mdLink("Tüm ürünler", `${origin}/collections/all`, "Tam ürün listesi ve filtreler"),
    mdLink("Blog", `${origin}/blogs/news`, "Köpek bakımı ve ürün rehberleri"),
    "",
  ];

  if (collections.filter((c) => c.slug !== "all").length) {
    lines.push("## Koleksiyonlar");
    for (const c of collections.filter((c) => c.slug !== "all")) {
      const desc = c.description?.trim() || `${c.title} ürün koleksiyonu`;
      lines.push(mdLink(c.title, `${origin}/collections/${c.slug}`, desc));
    }
    lines.push("");
  }

  if (products.length) {
    lines.push("## Ürünler");
    for (const p of products) {
      const desc =
        p.seoDescription?.trim() ||
        p.description?.trim().slice(0, 120) ||
        `${p.title} — doğal köpek ödül maması`;
      lines.push(mdLink(p.title, `${origin}/products/${p.slug}`, desc));
    }
    lines.push("");
  }

  if (blogPosts.length) {
    lines.push("## Blog yazıları");
    for (const b of blogPosts) {
      const desc = b.excerptTr?.trim().slice(0, 120) || b.titleTr;
      lines.push(mdLink(b.titleTr, `${origin}/blogs/news/${b.slug}`, desc));
    }
    lines.push("");
  }

  const gmcToken = settings.googleMerchant?.feedToken?.trim();
  const productsJsonPath = aiProductsFeedPath();
  const merchantPath = googleMerchantFeedPath(gmcToken || undefined);

  lines.push(
    "## Makine okunur veri",
    mdLink("Ürün kataloğu (JSON)", `${origin}${productsJsonPath}`, "Fiyat, stok, kategori ve açıklama — AI tarama için"),
    mdLink("Google Merchant feed", `${origin}${merchantPath}`, "RSS 2.0 ürün beslemesi"),
    mdLink("Site haritası", `${origin}/sitemap.xml`, "Tüm dizinlenebilir URL'ler"),
    mdLink("Blog RSS", blogFeedUrl(), "Yayınlanmış blog yazıları"),
    "",
    "## İletişim",
    mdLink("WhatsApp", `${origin}/`, "Sitedeki WhatsApp botu ile sipariş ve ürün önerisi"),
  );

  return `${lines.join("\n")}\n`;
}

export function llmsTxtUrl(): string {
  return `${getPublicSiteUrl()}/llms.txt`;
}
