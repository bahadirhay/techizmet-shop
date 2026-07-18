import { NextResponse } from "next/server";
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
import {
  serializeMarketplaceMarkupFromForm,
  serializeMarketplacePricesFromForm,
} from "@/lib/marketplace/product-prices";
import { resolveProductCategorySelection, syncProductCategoryLinks } from "@/lib/store-product-categories";
import { resolveProductSeoFields } from "@/lib/admin/product-seo/ensure-seo";
import { SITE_DEFAULT_EXPLORE_SENTINEL } from "@/lib/product-explore-looks";
import { productAdminErrorResponse } from "@/lib/admin/product-api-errors";
import { notifyPublishedProduct } from "@/lib/seo/publish-notify";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const products = await prisma.storeProduct.findMany({
    where: { siteId: auth.siteId },
    orderBy: { updatedAt: "desc" },
    include: { collection: true, brand: true, category: true, _count: { select: { images: true } } },
  });
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as Record<string, unknown>;

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
  const weightGrams = body.weightGrams ? parseInt(String(body.weightGrams), 10) : null;
  const pieceCount = body.pieceCount ? parseInt(String(body.pieceCount), 10) : null;

  const slug = slugify(String(body.slug ?? title));
  const mediaItems = parseProductMediaInput(body) ?? [];
  const primaryImageUrl =
    mediaItems.length > 0
      ? mediaItems.find((m) => m.mediaType === "image")?.url ?? mediaItems[0]?.url
      : String(body.imageUrl ?? "").trim() || null;

  const maxSort = await prisma.storeProduct.aggregate({
    where: { siteId: auth.siteId },
    _max: { sortOrder: true, catalogSortOrder: true },
  });
  const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;
  const nextCatalogSortOrder = (maxSort._max.catalogSortOrder ?? -1) + 1;

  const variants = parseVariantInputs(body.variants);
  const variantOptionName = String(body.variantOptionName ?? "").trim() || null;
  const settings = await getSiteSettings(auth.siteId);
  const barcodeSettings = getProductBarcodeSettings(settings);
  const autoGenerate =
    body.autoGenerateBarcode === true ||
    (body.autoGenerateBarcode !== false && barcodeSettings.autoGenerate);

  try {
    const { primaryCategoryId, categoryIds } = await resolveProductCategorySelection(
      prisma,
      auth.siteId,
      body,
    );
    const seoFields = await resolveProductSeoFields(auth.siteId, {
      title,
      brandId: String(body.brandId ?? "").trim() || null,
      categoryId: primaryCategoryId,
      categoryIds,
      description: String(body.description ?? "").trim() || null,
      seoTitle: String(body.seoTitle ?? "").trim() || null,
      seoDescription: String(body.seoDescription ?? "").trim() || null,
    });
    const barcode = await resolveProductBarcode(prisma, auth.siteId, {
      barcode: String(body.barcode ?? "").trim() || null,
      autoGenerate,
      prefix: barcodeSettings.prefix,
    });
    const created = await prisma.storeProduct.create({
      data: {
        siteId: auth.siteId,
        title,
        slug,
        description: String(body.description ?? "").trim() || null,
        descriptionHtml: String(body.descriptionHtml ?? "").trim() || null,
        keyFeaturesHtml: String(body.keyFeaturesHtml ?? "").trim() || null,
        howToUseHtml: String(body.howToUseHtml ?? "").trim() || null,
        highlightsJson: String(body.highlightsJson ?? "").trim() || null,
        exploreLooksJson:
          body.useSiteDefaultExplore === true
            ? SITE_DEFAULT_EXPLORE_SENTINEL
            : String(body.exploreLooksJson ?? "").trim() || null,
        sku: String(body.sku ?? "").trim() || null,
        barcode,
        collectionId: String(body.collectionId ?? "").trim() || null,
        categoryId: primaryCategoryId,
        brandId: String(body.brandId ?? "").trim() || null,
        priceMinor: tryToMinor(body.price as string),
        compareAtMinor: body.compareAt ? tryToMinor(body.compareAt as string) : null,
        costMinor: body.cost ? tryToMinor(body.cost as string) : null,
        wholesalePriceMinor: body.wholesale ? tryToMinor(body.wholesale as string) : null,
        vatRate: vatRateFromRequestBody(body),
        marketplacePricesJson: serializeMarketplacePricesFromForm(
          (body.marketplacePrices as Record<string, string>) ?? {},
        ),
        marketplaceMarkupPercentJson: serializeMarketplaceMarkupFromForm(
          (body.marketplaceMarkups as Record<string, string>) ?? {},
        ),
        stockQty: parseInt(String(body.stockQty ?? "0"), 10) || 0,
        lowStockThreshold: parseInt(String(body.lowStockThreshold ?? "5"), 10) || 5,
        weightGrams,
        pieceCount,
        desi: body.desi ? parseFloat(String(body.desi)) : null,
        seoTitle: seoFields.seoTitle,
        seoDescription: seoFields.seoDescription,
        imageUrl: primaryImageUrl,
        variantOptionName,
        badgesJson: serializeProductBadges(
          Array.isArray(body.badges)
            ? body.badges.filter((x): x is ProductBadgeId => typeof x === "string")
            : [],
        ),
        published: body.published !== false,
        sortOrder: nextSortOrder,
        catalogSortOrder: nextCatalogSortOrder,
        images: {
          create: mediaItems.map((m, i) => ({
            url: m.url,
            mediaType: m.mediaType,
            sortOrder: i,
          })),
        },
      },
    });
    await syncProductCategoryLinks(prisma, created.id, categoryIds);
    if (variants.length) {
      await upsertProductVariants(prisma, created.id, variantOptionName, variants);
    }

    if (created.published) {
      notifyPublishedProduct(created.slug);
    }

    try {
      const { syncSingleProductToStock } = await import("@/lib/stock/sync-products");
      await syncSingleProductToStock(prisma, auth.siteId, created.id, {
        staffUserId: auth.staffUserId,
      });
    } catch {
      /* stok kartı senkronu isteğe bağlı */
    }

    return NextResponse.json({ product: created });
  } catch (e) {
    return productAdminErrorResponse(e);
  }
}
