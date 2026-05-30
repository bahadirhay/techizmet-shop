import { pushMarketplaceProducts } from "@/lib/marketplace/actions";
import { minorToTry } from "@/lib/admin/money";

export type SyncResult = {
  ok: boolean;
  itemsCount: number;
  message: string;
};

export async function runMarketplaceSync(
  siteId: string,
  platform: string,
  config: Record<string, string>,
): Promise<SyncResult> {
  if (!config.apiKey?.trim() && !config.sellerId?.trim()) {
    return {
      ok: false,
      itemsCount: 0,
      message: "API Key veya Satıcı ID girilmeden senkron yapılamaz.",
    };
  }

  const result = await pushMarketplaceProducts(siteId, platform, config);
  return { ok: result.ok, itemsCount: result.itemsCount, message: result.message };
}

export function buildMarketplaceProductXml(
  siteName: string,
  products: {
    slug: string;
    title: string;
    sku: string | null;
    barcode: string | null;
    priceMinor: number;
    stockQty: number;
    imageUrl: string | null;
    description: string | null;
    brand?: { name: string } | null;
    category?: { title: string } | null;
  }[],
): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const items = products
    .map(
      (p) => `  <product>
    <id>${esc(p.slug)}</id>
    <sku>${esc(p.sku ?? p.slug)}</sku>
    <barcode>${esc(p.barcode ?? "")}</barcode>
    <title>${esc(p.title)}</title>
    <brand>${esc(p.brand?.name ?? "")}</brand>
    <category>${esc(p.category?.title ?? "")}</category>
    <price>${minorToTry(p.priceMinor)}</price>
    <stock>${p.stockQty}</stock>
    <image>${esc(p.imageUrl ?? "")}</image>
    <description>${esc((p.description ?? "").slice(0, 500))}</description>
  </product>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<catalog store="${esc(siteName)}" generated="${new Date().toISOString()}">
${items}
</catalog>`;
}
