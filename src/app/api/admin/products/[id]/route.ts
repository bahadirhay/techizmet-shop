import { NextResponse } from "next/server";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { slugify } from "@/lib/admin/slug";
import { tryToMinor } from "@/lib/admin/money";
import { parseVariantInputs, upsertProductVariants } from "@/lib/admin/product-variants";
import { serializeProductBadges, type ProductBadgeId } from "@/lib/product-badges";
import { resolveProductBarcode, getProductBarcodeSettings } from "@/lib/admin/product-barcode";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { syncProductMedia } from "@/lib/admin/sync-product-media";
import { parseProductMediaInput } from "@/lib/product-media";
import { vatRateFromRequestBody } from "@/lib/admin/product-vat";
import { serializeMarketplacePricesFromForm } from "@/lib/marketplace/product-prices";
import { resolveProductCategorySelection, syncProductCategoryLinks } from "@/lib/store-product-categories";
import { resolveProductSeoFields } from "@/lib/admin/product-seo/ensure-seo";
import { SITE_DEFAULT_EXPLORE_SENTINEL } from "@/lib/product-explore-looks";
import { productAdminErrorResponse } from "@/lib/admin/product-api-errors";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const product = await prisma.storeProduct.findFirst({
    where: { id, siteId: auth.siteId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      collection: true,
      brand: true,
      category: true,
      categoryLinks: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeProduct.findFirst({ where: { id, siteId: auth.siteId } });
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

    await prisma.storeProduct.update({
      where: { id },
      data: {
        title,
        slug,
        description: body.description != null ? String(body.description).trim() || null : undefined,
        descriptionHtml:
          body.descriptionHtml != null ? String(body.descriptionHtml).trim() || null : undefined,
        keyFeaturesHtml:
          body.keyFeaturesHtml != null ? String(body.keyFeaturesHtml).trim() || null : undefined,
        howToUseHtml:
          body.howToUseHtml != null ? String(body.howToUseHtml).trim() || null : undefined,
        highlightsJson:
          body.highlightsJson !== undefined
            ? String(body.highlightsJson).trim() || null
            : undefined,
        exploreLooksJson:
          body.useSiteDefaultExplore === true
            ? SITE_DEFAULT_EXPLORE_SENTINEL
            : body.exploreLooksJson !== undefined
              ? String(body.exploreLooksJson).trim() || null
              : undefined,
        sku: body.sku != null ? String(body.sku).trim() || null : undefined,
        barcode: nextBarcode,
        collectionId:
          body.collectionId !== undefined ? String(body.collectionId ?? "").trim() || null : undefined,
        categoryId: categorySelection?.primaryCategoryId ?? undefined,
        brandId: body.brandId !== undefined ? String(body.brandId ?? "").trim() || null : undefined,
        priceMinor: body.price != null ? tryToMinor(body.price as string) : undefined,
        compareAtMinor:
          body.compareAt !== undefined
            ? body.compareAt
              ? tryToMinor(body.compareAt as string)
              : null
            : undefined,
        costMinor:
          body.cost !== undefined ? (body.cost ? tryToMinor(body.cost as string) : null) : undefined,
        vatRate: body.vatRate !== undefined ? vatRateFromRequestBody(body) : undefined,
        marketplacePricesJson:
          body.marketplacePrices !== undefined
            ? serializeMarketplacePricesFromForm(
                (body.marketplacePrices as Record<string, string>) ?? {},
              )
            : undefined,
        stockQty: body.stockQty != null ? parseInt(String(body.stockQty), 10) || 0 : undefined,
        lowStockThreshold:
          body.lowStockThreshold != null
            ? parseInt(String(body.lowStockThreshold), 10) || 5
            : undefined,
        weightGrams:
          body.weightGrams !== undefined
            ? body.weightGrams
              ? parseInt(String(body.weightGrams), 10)
              : null
            : undefined,
        pieceCount:
          body.pieceCount !== undefined
            ? body.pieceCount
              ? parseInt(String(body.pieceCount), 10)
              : null
            : undefined,
        desi: body.desi !== undefined ? (body.desi ? parseFloat(String(body.desi)) : null) : undefined,
        seoTitle: seoFields.seoTitle,
        seoDescription: seoFields.seoDescription,
        imageUrl:
          primaryImageUrl !== undefined
            ? primaryImageUrl
            : body.imageUrl != null
              ? String(body.imageUrl).trim() || null
              : undefined,
        published: body.published !== undefined ? Boolean(body.published) : undefined,
        badgesJson:
          body.badges !== undefined
            ? serializeProductBadges(
                Array.isArray(body.badges)
                  ? body.badges.filter((x): x is ProductBadgeId => typeof x === "string")
                  : [],
              )
            : undefined,
        variantOptionName:
          body.variantOptionName !== undefined
            ? String(body.variantOptionName ?? "").trim() || null
            : undefined,
      },
    });

    if (categorySelection) {
      await syncProductCategoryLinks(prisma, id, categorySelection.categoryIds);
    }

    if (body.variants !== undefined) {
      const variants = parseVariantInputs(body.variants);
      const optionName =
        body.variantOptionName !== undefined
          ? String(body.variantOptionName ?? "").trim() || null
          : existing.variantOptionName;
      if (variants.length) {
        await upsertProductVariants(prisma, id, optionName, variants);
      } else {
        await prisma.storeProductVariant.deleteMany({ where: { productId: id } });
        await prisma.storeProduct.update({
          where: { id },
          data: { variantOptionName: null },
        });
      }
    }

    const product = await prisma.storeProduct.findFirst({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { sortOrder: "asc" } },
        categoryLinks: { orderBy: { sortOrder: "asc" } },
      },
    });
    revalidateStorePublicCache(auth.siteId, product?.slug ?? existing.slug);
    return NextResponse.json({ product });
  } catch (e) {
    return productAdminErrorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeProduct.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  await prisma.storeProduct.delete({ where: { id } });
  revalidateStorePublicCache(auth.siteId, existing.slug);
  return NextResponse.json({ ok: true });
}
