import "server-only";

import type { BlogTopicProduct } from "@/lib/admin/blog-automation/topics";
import { prisma } from "@/lib/prisma";

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function queryTokens(query: string): string[] {
  const stop = new Set([
    "icin",
    "için",
    "nedir",
    "nelerdir",
    "nasil",
    "nasıl",
    "olan",
    "olanlar",
    "kopek",
    "köpek",
    "kopekler",
    "köpekler",
    "the",
    "and",
    "for",
    "with",
  ]);
  return [...new Set(
    query
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3 && !stop.has(w)),
  )].slice(0, 10);
}

export async function loadBlogResearchContext(
  siteId: string,
  query: string,
): Promise<{ products: BlogTopicProduct[]; contextText: string }> {
  const tokens = queryTokens(query);
  const or: { title?: object; description?: object; descriptionHtml?: object; slug?: object }[] = [];

  const phrase = query.trim().slice(0, 80);
  if (phrase.length >= 4) {
    const contains = { contains: phrase, mode: "insensitive" as const };
    or.push({ title: contains }, { description: contains }, { descriptionHtml: contains });
  }
  for (const token of tokens) {
    const contains = { contains: token, mode: "insensitive" as const };
    or.push({ title: contains }, { description: contains }, { slug: contains });
  }

  const rows = await prisma.storeProduct.findMany({
    where: {
      siteId,
      published: true,
      ...(or.length ? { OR: or } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 4,
    select: {
      slug: true,
      title: true,
      imageUrl: true,
      description: true,
      descriptionHtml: true,
      keyFeaturesHtml: true,
      howToUseHtml: true,
      highlightsJson: true,
      weightGrams: true,
      pieceCount: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });

  const products: BlogTopicProduct[] = rows.map((p) => ({
    slug: p.slug,
    title: p.title,
    imageUrl: p.imageUrl || p.images[0]?.url || null,
  }));

  const blocks = rows.map((p) => {
    const parts = [
      `Ürün: ${p.title} (/products/${p.slug})`,
      p.description?.trim() ? `Açıklama: ${p.description.trim()}` : "",
      p.descriptionHtml ? `Detay: ${stripHtml(p.descriptionHtml).slice(0, 2000)}` : "",
      p.keyFeaturesHtml ? `Özellikler: ${stripHtml(p.keyFeaturesHtml).slice(0, 1200)}` : "",
      p.howToUseHtml ? `Kullanım: ${stripHtml(p.howToUseHtml).slice(0, 800)}` : "",
      p.highlightsJson ? `Vurgular: ${p.highlightsJson.slice(0, 600)}` : "",
      p.weightGrams ? `Paket: ${p.weightGrams}g` : "",
      p.pieceCount ? `Adet: ${p.pieceCount}` : "",
    ].filter(Boolean);
    return parts.join("\n");
  });

  const contextText = blocks.length
    ? blocks.join("\n\n---\n\n")
    : "Mağazada doğrudan eşleşen ürün bulunamadı — konu hakkında genel pet shop bilgisiyle yaz.";

  return { products, contextText };
}
