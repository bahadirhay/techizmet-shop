import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { resolveProductCategorySelection, syncProductCategoryLinks } from "@/lib/store-product-categories";
import { notifyPublishedProducts } from "@/lib/seo/publish-notify";

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    ids?: string[];
    published?: boolean;
    categoryId?: string | null;
    brandId?: string | null;
    collectionId?: string | null;
    stockDelta?: number;
    delete?: boolean;
  };

  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "En az bir ürün seçin" }, { status: 400 });
  }

  const owned = await prisma.storeProduct.findMany({
    where: { siteId: auth.siteId, id: { in: ids } },
    select: { id: true, stockQty: true, slug: true, published: true },
  });
  if (owned.length === 0) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }
  const ownedIds = owned.map((p) => p.id);

  if (body.delete) {
    await prisma.storeProduct.deleteMany({ where: { id: { in: ownedIds }, siteId: auth.siteId } });
    return NextResponse.json({ ok: true, count: ownedIds.length });
  }

  const data: Record<string, unknown> = {};
  if (body.published !== undefined) data.published = Boolean(body.published);
  if (body.brandId !== undefined) data.brandId = body.brandId || null;
  if (body.collectionId !== undefined) data.collectionId = body.collectionId || null;

  if (Object.keys(data).length > 0 || body.categoryId !== undefined) {
    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.storeProduct.updateMany({
          where: { id: { in: ownedIds }, siteId: auth.siteId },
          data,
        });
      }
      if (body.categoryId !== undefined) {
        const selection = await resolveProductCategorySelection(tx, auth.siteId, {
          categoryId: body.categoryId,
        });
        await tx.storeProduct.updateMany({
          where: { id: { in: ownedIds }, siteId: auth.siteId },
          data: { categoryId: selection.primaryCategoryId },
        });
        for (const productId of ownedIds) {
          await syncProductCategoryLinks(tx, productId, selection.categoryIds);
        }
      }
    });
  }

  if (body.stockDelta != null && body.stockDelta !== 0) {
    const delta = parseInt(String(body.stockDelta), 10);
    if (!Number.isNaN(delta)) {
      for (const p of owned) {
        await prisma.storeProduct.update({
          where: { id: p.id },
          data: { stockQty: Math.max(0, p.stockQty + delta) },
        });
      }
    }
  }

  if (body.published === true) {
    notifyPublishedProducts(owned.filter((p) => p.published || body.published).map((p) => p.slug));
  }

  return NextResponse.json({ ok: true, count: ownedIds.length });
}
