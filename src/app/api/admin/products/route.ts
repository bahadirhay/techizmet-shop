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
import { serializeMarketplacePricesFromForm } from "@/lib/marketplace/product-prices";
import { resolveProductCategorySelection, syncProductCategoryLinks } from "@/lib/store-product-categories";

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

  const slug = slugify(String(body.slug ?? title));
  const mediaItems = parseProductMediaInput(body) ?? [];
  const primaryImageUrl =
    mediaItems.length > 0
      ? mediaItems.find((m) => m.mediaType === "image")?.url ?? mediaItems[0]?.url
      : String(body.imageUrl ?? "").trim() || null;

  const variants = parseVariantInputs(body.variants);
  const variantOptionName = String(body.variantOptionName ?? "").trim() || null;
  const settings = await getSiteSettings(auth.siteId);
  const barcodeSettings = getProductBarcodeSettings(settings);
  const autoGenerate =
    body.autoGenerateBarcode === true ||
    (body.autoGenerateBarcode !== false && barcodeSettings.autoGenerate);

  const product = await prisma.$transaction(async (tx) => {
    const { primaryCategoryId, categoryIds } = await resolveProductCategorySelection(tx, auth.siteId, body);
    const barcode = await resolveProductBarcode(tx, auth.siteId, {
      barcode: String(body.barcode ?? "").trim() || null,
      autoGenerate,
      prefix: barcodeSettings.prefix,
    });
    const created = await tx.storeProduct.create({
      data: {
        siteId: auth.siteId,
        title,
        slug,
        description: String(body.description ?? "").trim() || null,
        descriptionHtml: String(body.descriptionHtml ?? "").trim() || null,
        keyFeaturesHtml: String(body.keyFeaturesHtml ?? "").trim() || null,
        howToUseHtml: String(body.howToUseHtml ?? "").trim() || null,
        exploreLooksJson:
          body.useSiteDefaultExplore === true
            ? null
            : String(body.exploreLooksJson ?? "").trim() || null,
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
        stockQty: parseInt(String(body.stockQty ?? "0"), 10) || 0,
        lowStockThreshold: parseInt(String(body.lowStockThreshold ?? "5"), 10) || 5,
        weightGrams: body.weightGrams ? parseInt(String(body.weightGrams), 10) : null,
        desi: body.desi ? parseFloat(String(body.desi)) : null,
        seoTitle: String(body.seoTitle ?? "").trim() || null,
        seoDescription: String(body.seoDescription ?? "").trim() || null,
        imageUrl: primaryImageUrl,
        variantOptionName,
        badgesJson: serializeProductBadges(
          Array.isArray(body.badges)
            ? body.badges.filter((x): x is ProductBadgeId => typeof x === "string")
            : [],
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
    await syncProductCategoryLinks(tx, created.id, categoryIds);
    if (variants.length) {
      await upsertProductVariants(tx, created.id, variantOptionName, variants);
    }
    return created;
  });

  return NextResponse.json({ product });
}
