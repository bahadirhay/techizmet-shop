import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import type { ProductAttributeOverride } from "@/lib/marketplace/attribute-mapping";

type Item = { productId: string; attributes: ProductAttributeOverride[] };
type Body = { items?: Item[] };

function cleanAttributes(input: ProductAttributeOverride[]): ProductAttributeOverride[] {
  return (input ?? [])
    .map((a) => {
      const attributeId = Number(a.attributeId);
      if (!Number.isFinite(attributeId)) return null;
      const valueId = a.attributeValueId != null ? Number(a.attributeValueId) : null;
      const custom = a.customValue?.toString().trim() || null;
      if (valueId == null && !custom) return null;
      return {
        attributeId,
        attributeName: a.attributeName ?? undefined,
        attributeValueId: valueId,
        attributeValueName: a.attributeValueName ?? null,
        customValue: custom,
      } as ProductAttributeOverride;
    })
    .filter((x): x is ProductAttributeOverride => x != null);
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as Body;
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ error: "Kaydedilecek ürün yok" }, { status: 400 });

  const ids = items.map((i) => i.productId);
  const products = await prisma.storeProduct.findMany({
    where: { siteId: auth.siteId, id: { in: ids } },
    select: { id: true, marketplaceAttributesJson: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  let saved = 0;
  for (const item of items) {
    const p = byId.get(item.productId);
    if (!p) continue;
    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(p.marketplaceAttributesJson ?? "{}") as Record<string, unknown>;
    } catch {
      existing = {};
    }
    existing.trendyol = cleanAttributes(item.attributes);
    await prisma.storeProduct.update({
      where: { id: p.id },
      data: { marketplaceAttributesJson: JSON.stringify(existing) },
    });
    saved++;
  }

  return NextResponse.json({ ok: true, saved });
}
