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
import {
  notifyPublishedProduct,
  shouldReindexPublishedProduct,
} from "@/lib/seo/publish-notify";

export async function GET() {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const bundles = await prisma.storeProduct.findMany({
    where: { siteId: auth.siteId, kind: PRODUCT_KIND_BUNDLE },
    orderBy: { updatedAt: "desc" },
    include: {
      collection: true,
      category: true,
      brand: true,
      bundleComponents: {
        orderBy: { sortOrder: "asc" },
        include: {
          componentProduct: { select: { title: true } },
          componentVariant: { select: { label: true } },
        },
      },
      _count: { select: { bundleComponents: true } },
    },
  });

  return NextResponse.json({ bundles });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as Record<string, unknown>;

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });

  const components = parseBundleComponentInputs(body.components);
  const componentCheck = await validateBundleComponents(prisma, auth.siteId, null, components);
  if (!componentCheck.ok) {
    return NextResponse.json({ error: componentCheck.error }, { status: 400 });
  }

  const slug = slugify(String(body.slug ?? title));
  const mediaItems = parseProductMediaInput(body) ?? [];
  const primaryImageUrl =
    mediaItems.length > 0
      ? (mediaItems.find((m) => m.mediaType === "image")?.url ?? mediaItems[0]?.url)
      : String(body.imageUrl ?? "").trim() || null;

  const weightGrams = body.weightGrams ? parseInt(String(body.weightGrams), 10) : null;
  const pieceCount = body.pieceCount ? parseInt(String(body.pieceCount), 10) : null;

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

    const created = await prisma.$transaction(async (tx) => {
      const maxSort = await tx.storeProduct.aggregate({
        where: { siteId: auth.siteId },
        _max: { sortOrder: true },
      });
      const product = await tx.storeProduct.create({
        data: {
          siteId: auth.siteId,
          kind: PRODUCT_KIND_BUNDLE,
          title,
          slug,
          description: String(body.description ?? "").trim() || null,
          descriptionHtml: String(body.descriptionHtml ?? "").trim() || null,
          keyFeaturesHtml: String(body.keyFeaturesHtml ?? "").trim() || null,
          howToUseHtml: String(body.howToUseHtml ?? "").trim() || null,
          sku: String(body.sku ?? "").trim() || null,
          barcode,
          collectionId: String(body.collectionId ?? "").trim() || null,
          categoryId: primaryCategoryId,
          brandId: String(body.brandId ?? "").trim() || null,
          priceMinor: tryToMinor(body.price as string),
          compareAtMinor: body.compareAt ? tryToMinor(body.compareAt as string) : null,
          costMinor: body.cost ? tryToMinor(body.cost as string) : null,
          vatRate: vatRateFromRequestBody(body),
          marketplacePricesJson: serializeMarketplacePricesFromForm(
            (body.marketplacePrices as Record<string, string>) ?? {},
          ),
          marketplaceMarkupPercentJson: serializeMarketplaceMarkupFromForm(
            (body.marketplaceMarkups as Record<string, string>) ?? {},
          ),
          stockQty: 0,
          lowStockThreshold: parseInt(String(body.lowStockThreshold ?? "5"), 10) || 5,
          weightGrams,
          pieceCount,
          desi: body.desi ? parseFloat(String(body.desi)) : null,
          seoTitle: seoFields.seoTitle,
          seoDescription: seoFields.seoDescription,
          imageUrl: primaryImageUrl,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
          badgesJson: serializeProductBadges(
            (() => {
              const ids = Array.isArray(body.badges)
                ? body.badges.filter((x): x is ProductBadgeId => typeof x === "string")
                : [];
              return ids.includes("bundle") ? ids : ["bundle", ...ids];
            })(),
          ),
          published: body.published !== false,
          images: {
            create: mediaItems.map((m, i) => ({
              url: m.url,
              mediaType: m.mediaType,
              sortOrder: i,
            })),
          },
        },
      });

      await syncProductCategoryLinks(tx, product.id, categoryIds);
      await replaceBundleComponents(tx, product.id, components);
      await syncBundleStockCache(tx, product.id);

      return tx.storeProduct.findUniqueOrThrow({
        where: { id: product.id },
        include: {
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
    if (created.published) {
      notifyPublishedProduct(created.slug);
    }
    return NextResponse.json({ bundle: created });
  } catch (e) {
    return productAdminErrorResponse(e);
  }
}
