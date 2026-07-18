import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";

/** Ana sayfa ürün sırası — sürükle-bırak kaydı */
export async function PATCH(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { productIds?: string[] };
  const productIds = Array.isArray(body.productIds) ? body.productIds.map(String).filter(Boolean) : [];
  if (!productIds.length) {
    return NextResponse.json({ error: "productIds gerekli" }, { status: 400 });
  }

  const products = await prisma.storeProduct.findMany({
    where: { siteId: auth.siteId, id: { in: productIds } },
    select: { id: true },
  });
  const allowed = new Set(products.map((p) => p.id));

  const updates = productIds
    .map((id, index) => {
      if (!allowed.has(id)) return null;
      return prisma.storeProduct.update({
        where: { id },
        data: { sortOrder: index },
      });
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  if (updates.length) await prisma.$transaction(updates);

  // Sıralama kaydedilince ana sayfa otomatik «manuel» moda geçer
  const site = await prisma.storeSite.findUnique({
    where: { id: auth.siteId },
    select: { settingsJson: true },
  });
  if (site) {
    const settings = parseSiteSettings(site.settingsJson);
    const next = mergeSiteSettings(settings, {
      store: {
        ...settings.store,
        texts: {
          ...settings.store?.texts,
          homeListingSort: "manual",
        },
      },
    });
    await prisma.storeSite.update({
      where: { id: auth.siteId },
      data: { settingsJson: JSON.stringify(next) },
    });
  }

  try {
    revalidateStorePublicCache(auth.siteId);
  } catch {
    // ignore
  }
  revalidatePath("/");
  revalidatePath("/admin/products/home-order");

  return NextResponse.json({ ok: true, count: updates.length });
}
