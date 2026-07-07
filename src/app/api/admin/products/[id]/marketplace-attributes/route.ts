import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseProductAttributes, type ProductAttributeOverride } from "@/lib/marketplace/attribute-mapping";

type Body = {
  platform?: string;
  attributes?: ProductAttributeOverride[];
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const body = (await req.json()) as Body;
  const platform = String(body.platform ?? "").trim().toLowerCase();
  if (!platform) return NextResponse.json({ error: "Platform gerekli" }, { status: 400 });

  const product = await prisma.storeProduct.findFirst({
    where: { id, siteId: auth.siteId },
    select: { id: true, marketplaceAttributesJson: true },
  });
  if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

  const clean: ProductAttributeOverride[] = (body.attributes ?? [])
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

  const existing = (() => {
    try {
      return JSON.parse(product.marketplaceAttributesJson ?? "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  })();
  existing[platform] = clean;

  await prisma.storeProduct.update({
    where: { id: product.id },
    data: { marketplaceAttributesJson: JSON.stringify(existing) },
  });

  return NextResponse.json({ ok: true, attributes: clean });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const platform = new URL(req.url).searchParams.get("platform")?.trim().toLowerCase() ?? "trendyol";

  const product = await prisma.storeProduct.findFirst({
    where: { id, siteId: auth.siteId },
    select: { marketplaceAttributesJson: true },
  });
  if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

  return NextResponse.json({
    attributes: parseProductAttributes(product.marketplaceAttributesJson, platform),
  });
}
