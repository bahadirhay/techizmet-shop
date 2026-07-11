/** Amazon seller SKU kaynağı: listing metaJson → ürün SKU → slug/barkod → id. */
export type AmazonSkuProduct = {
  sku: string | null;
  slug: string;
  barcode: string | null;
  id: string;
};

export function resolveAmazonListingSku(
  metaJson: string | null,
  product: AmazonSkuProduct,
): string {
  if (metaJson) {
    try {
      const meta = JSON.parse(metaJson) as { sku?: string };
      if (meta.sku?.trim()) return meta.sku.trim();
    } catch {
      /* metaJson bozuk */
    }
  }
  return (product.sku?.trim() || product.slug?.trim() || product.barcode?.trim() || product.id).slice(
    0,
    40,
  );
}
