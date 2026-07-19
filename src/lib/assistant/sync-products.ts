import { prisma } from "@/lib/prisma";
import { stripHtmlForAssistant } from "@/lib/assistant/html";
import { storefrontListedWhere } from "@/lib/storefront-product-where";

function formatTry(minor: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

function buildProductBody(p: {
  title: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  priceMinor: number;
  stockQty: number;
  description: string | null;
  descriptionHtml: string | null;
  keyFeaturesHtml: string | null;
  howToUseHtml: string | null;
  brand: { name: string } | null;
}): string {
  const parts = [
    p.brand?.name ? `Marka: ${p.brand.name}` : "",
    `Fiyat: ${formatTry(p.priceMinor)}`,
    p.stockQty > 0 ? `Stok: ${p.stockQty} adet` : "Stok: tükendi",
    p.sku ? `SKU: ${p.sku}` : "",
    p.barcode ? `Barkod: ${p.barcode}` : "",
    p.description?.trim() ? p.description.trim() : "",
    p.descriptionHtml ? stripHtmlForAssistant(p.descriptionHtml) : "",
    p.keyFeaturesHtml ? `Özellikler: ${stripHtmlForAssistant(p.keyFeaturesHtml)}` : "",
    p.howToUseHtml ? `Kullanım: ${stripHtmlForAssistant(p.howToUseHtml)}` : "",
    `Ürün sayfası: /products/${p.slug}`,
  ];
  return parts.filter(Boolean).join("\n");
}

export async function syncAssistantProductsToKnowledge(siteId: string): Promise<{
  synced: number;
  deactivated: number;
}> {
  const products = await prisma.storeProduct.findMany({
    where: { siteId, ...storefrontListedWhere },
    select: {
      id: true,
      title: true,
      slug: true,
      sku: true,
      barcode: true,
      priceMinor: true,
      stockQty: true,
      description: true,
      descriptionHtml: true,
      keyFeaturesHtml: true,
      howToUseHtml: true,
      imageUrl: true,
      brand: { select: { name: true } },
    },
    orderBy: { title: "asc" },
  });

  const activeIds = new Set(products.map((p) => p.id));
  let synced = 0;

  for (const p of products) {
    const body = buildProductBody(p);
    const keywords = [p.title, p.sku, p.barcode, p.brand?.name, p.slug]
      .filter(Boolean)
      .join(", ");
    const data = {
      title: p.title,
      body,
      keywords,
      imageUrl: p.imageUrl,
      active: true,
      metadataJson: JSON.stringify({ slug: p.slug }),
    };

    const existing = await prisma.assistantKnowledgeEntry.findFirst({
      where: { siteId, entryType: "product", sourceRef: p.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.assistantKnowledgeEntry.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.assistantKnowledgeEntry.create({
        data: {
          siteId,
          channel: "*",
          entryType: "product",
          sourceRef: p.id,
          ...data,
        },
      });
    }
    synced += 1;
  }

  const stale = await prisma.assistantKnowledgeEntry.findMany({
    where: { siteId, entryType: "product", active: true },
    select: { id: true, sourceRef: true },
  });
  let deactivated = 0;
  for (const row of stale) {
    if (row.sourceRef && !activeIds.has(row.sourceRef)) {
      await prisma.assistantKnowledgeEntry.update({
        where: { id: row.id },
        data: { active: false },
      });
      deactivated += 1;
    }
  }

  return { synced, deactivated };
}
