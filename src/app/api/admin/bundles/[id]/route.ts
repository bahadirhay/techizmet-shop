import { NextResponse } from "next/server";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { slugify } from "@/lib/admin/slug";
import { tryToMinor } from "@/lib/admin/money";
import { serializeProductBadges, type ProductBadgeId } from "@/lib/product-badges";
import { resolveProductBarcode, getProductBarcodeSettings } from "@/lib/admin/product-barcode";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { syncProductMedia } from "@/lib/admin/sync-product-media";
import { parseProductMediaInput } from "@/lib/product-media";
import { vatRateFromRequestBody } from "@/lib/admin/product-vat";
import {
  serializeMarketplaceMarkupFromForm,
  serializeMarketplacePricesFromForm,
} from "@/lib/marketplace/product-prices";
import { resolveProductCategorySelection, syncProductCategoryLinks } from "@/lib/store-product-categories";
import { resolveProductSeoFields } from "@/lib/admin/product-seo/ensure-seo";
import { productAdminErrorResponse } from "@/lib/admin/product-api-errors";
import {
  PRODUCT_KIND_BUNDLE,
  parseBundleComponentInputs,
  replaceBundleComponents,
  syncBundleStockCache,
  validateBundleComponents,
} from "@/lib/product-bundle";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const bundle = await prisma.storeProduct.findFirst({
    where: { id, siteId: auth.siteId, kind: PRODUCT_KIND_BUNDLE },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      collection: true,
      brand: true,
      category: true,
      categoryLinks: { orderBy: { sortOrder: "asc" } },
      bundleComponents: {
        orderBy: { sortOrder: "asc" },
        include: {
          componentProduct: { select: { title: true } },
          componentVariant: { select: { label: true } },
        },
      },
    },
  });
  if (!bundle) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ bundle });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const existing = await prisma.storeProduct.findFirst({
    where: { id, siteId: auth.siteId, kind: PRODUCT_KIND_BUNDLE },
  });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const title = body.title != null ? String(body.title).trim() : existing.title;
  const slug = body.slug != null ? slugify(String(body.slug)) : existing.slug;
  const mediaItems = parseProductMediaInput(body);

  const settings = await getSiteSettings(auth.siteId);
  const barcodeSettings = getProductBarcodeSettings(settings);
  const autoGenerate =
    body.autoGenerateBarcode === true ||
    (body.autoGenerateBarcode !== false &&
      barcodeSettings.autoGenerate &&
      !existing.barcode?.trim());

  try {
    const components =
      body.components !== undefined ? parseBundleComponentInputs(body.components) : null;
    if (components) {
      const componentCheck = await validateBundleComponents(prisma, auth.siteId, id, components);
      if (!componentCheck.ok) {
        return NextResponse.json({ error: componentCheck.error }, { status: 400 });
      }
    }

    const categorySelection =
      body.categoryId !== undefined || body.categoryIds !== undefined
        ? await resolveProductCategorySelection(prisma, auth.siteId, {
            categoryId: body.categoryId !== undefined ? body.categoryId : existing.categoryId,
            categoryIds: body.categoryIds,
          })
        : null;

    let primaryImageUrl: string | null | undefined;
    if (mediaItems !== null) {
      primaryImageUrl = await syncProductMedia(prisma, id, mediaItems, auth.siteId);
    }

    let nextBarcode: string | null | undefined;
    if (body.barcode !== undefined || autoGenerate) {
      const rawBarcode =
        body.barcode !== undefined ? String(body.barcode).trim() || null : existing.barcode;
      nextBarcode = await resolveProductBarcode(prisma, auth.siteId, {
        barcode: rawBarcode,
        autoGenerate,
        prefix: barcodeSettings.prefix,
        excludeProductId: id,
      });
    }

    const seoFields = await resolveProductSeoFields(auth.siteId, {
      title,
      brandId:
        body.brandId !== undefined ? String(body.brandId ?? "").trim() || null : existing.brandId,
      categoryId: categorySelection?.primaryCategoryId ?? existing.categoryId,
      categoryIds: categorySelection?.categoryIds,
      description:
        body.description != null
          ? String(body.description).trim() || null
          : existing.description,
      seoTitle:
        body.seoTitle != null ? String(body.seoTitle).trim() || null : existing.seoTitle,
      seoDescription:
        body.seoDescription != null
          ? String(body.seoDescription).trim() || null
          : existing.seoDescription,
    });

    const weightGrams =
      body.weightGrams !== undefined
        ? body.weightGrams
          ? parseInt(String(body.weightGrams), 10)
          : null
        : undefined;
    const pieceCount =
      body.pieceCount !== undefined
        ? body.pieceCount
          ? parseInt(String(body.pieceCount), 10)
          : null
        : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.storeProduct.update({
        where: { id },
        data: {
          title,
          slug,
          ...(body.description !== undefined
            ? { description: String(body.description).trim() || null }
            : {}),
          ...(body.descriptionHtml !== undefined
            ? { descriptionHtml: String(body.descriptionHtml).trim() || null }
            : {}),
          ...(body.sku !== undefined ? { sku: String(body.sku).trim() || null } : {}),
          ...(nextBarcode !== undefined ? { barcode: nextBarcode } : {}),
          ...(body.collectionId !== undefined
            ? { collectionId: String(body.collectionId).trim() || null }
            : {}),
          ...(categorySelection
            ? { categoryId: categorySelection.primaryCategoryId }
            : {}),
          ...(body.brandId !== undefined
            ? { brandId: String(body.brandId).trim() || null }
            : {}),
          ...(body.price !== undefined ? { priceMinor: tryToMinor(body.price as string) } : {}),
          ...(body.compareAt !== undefined
            ? {
                compareAtMinor: body.compareAt
                  ? tryToMinor(body.compareAt as string)
                  : null,
              }
            : {}),
          ...(body.cost !== undefined
            ? { costMinor: body.cost ? tryToMinor(body.cost as string) : null }
            : {}),
          ...(body.vatRate !== undefined ? { vatRate: vatRateFromRequestBody(body) } : {}),
          ...(body.marketplacePrices !== undefined
            ? {
                marketplacePricesJson: serializeMarketplacePricesFromForm(
                  (body.marketplacePrices as Record<string, string>) ?? {},
                ),
              }
            : {}),
          ...(body.marketplaceMarkups !== undefined
            ? {
                marketplaceMarkupPercentJson: serializeMarketplaceMarkupFromForm(
                  (body.marketplaceMarkups as Record<string, string>) ?? {},
                ),
              }
            : {}),
          ...(body.lowStockThreshold !== undefined
            ? {
                lowStockThreshold:
                  parseInt(String(body.lowStockThreshold), 10) || existing.lowStockThreshold,
              }
            : {}),
          ...(weightGrams !== undefined ? { weightGrams } : {}),
          ...(pieceCount !== undefined ? { pieceCount } : {}),
          ...(body.desi !== undefined
            ? { desi: body.desi ? parseFloat(String(body.desi)) : null }
            : {}),
          seoTitle: seoFields.seoTitle,
          seoDescription: seoFields.seoDescription,
          ...(primaryImageUrl !== undefined ? { imageUrl: primaryImageUrl } : {}),
          ...(body.badges !== undefined
            ? {
                badgesJson: serializeProductBadges(
                  Array.isArray(body.badges)
                    ? body.badges.filter((x): x is ProductBadgeId => typeof x === "string")
                    : [],
                ),
              }
            : {}),
          ...(body.published !== undefined ? { published: body.published !== false } : {}),
        },
      });

      if (categorySelection) {
        await syncProductCategoryLinks(tx, id, categorySelection.categoryIds);
      }
      if (components) {
        await replaceBundleComponents(tx, id, components);
      }
      await syncBundleStockCache(tx, id);

      return tx.storeProduct.findUniqueOrThrow({
        where: { id },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          bundleComponents: {
            orderBy: { sortOrder: "asc" },
            include: {
              componentProduct: { select: { title: true } },
              componentVariant: { select: { label: true } },
            },
          },
        },
      });
    });

    await revalidateStorePublicCache(auth.siteId);
    return NextResponse.json({ bundle: updated });
  } catch (e) {
    return productAdminErrorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const existing = await prisma.storeProduct.findFirst({
    where: { id, siteId: auth.siteId, kind: PRODUCT_KIND_BUNDLE },
  });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  await prisma.storeProduct.delete({ where: { id } });
  await revalidateStorePublicCache(auth.siteId);
  return NextResponse.json({ ok: true });
}
