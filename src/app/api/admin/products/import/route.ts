import { NextResponse } from "next/server";
import { parsedRowToProductData, parseProductsWorkbook } from "@/lib/admin/product-excel";
import { getProductBarcodeSettings, resolveProductBarcode } from "@/lib/admin/product-barcode";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { syncProductCategoryLinks } from "@/lib/store-product-categories";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Excel dosyası gerekli" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseProductsWorkbook(buffer);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "Dosyada işlenecek ürün satırı yok" }, { status: 400 });
  }

  const [categories, brands, collections] = await Promise.all([
    prisma.storeCategory.findMany({ where: { siteId: auth.siteId }, select: { id: true, slug: true } }),
    prisma.storeBrand.findMany({ where: { siteId: auth.siteId }, select: { id: true, slug: true } }),
    prisma.storeCollection.findMany({ where: { siteId: auth.siteId }, select: { id: true, slug: true } }),
  ]);

  const categoryBySlug = new Map(categories.map((c) => [c.slug.toLowerCase(), c.id]));
  const brandBySlug = new Map(brands.map((b) => [b.slug.toLowerCase(), b.id]));
  const collectionBySlug = new Map(collections.map((c) => [c.slug.toLowerCase(), c.id]));
  const lookup = { categoryBySlug, brandBySlug, collectionBySlug };
  const settings = await getSiteSettings(auth.siteId);
  const barcodeSettings = getProductBarcodeSettings(settings);

  const results: {
    rowNum: number;
    title: string;
    action: "created" | "updated" | "skipped";
    error?: string;
  }[] = [];

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const row of parsed) {
    const converted = parsedRowToProductData(row, lookup);
    if ("error" in converted) {
      failed++;
      results.push({ rowNum: row.rowNum, title: row.title ?? "?", action: "skipped", error: converted.error });
      continue;
    }

    const data = converted;
    try {
      let existing = null;
      if (row.id?.trim()) {
        existing = await prisma.storeProduct.findFirst({
          where: { id: row.id.trim(), siteId: auth.siteId },
        });
      }
      if (!existing && data.sku) {
        existing = await prisma.storeProduct.findFirst({
          where: { siteId: auth.siteId, sku: data.sku },
        });
      }
      if (!existing) {
        existing = await prisma.storeProduct.findFirst({
          where: { siteId: auth.siteId, slug: data.slug },
        });
      }

      if (existing) {
        await prisma.$transaction(async (tx) => {
          const barcode = await resolveProductBarcode(tx, auth.siteId, {
            barcode: data.barcode,
            autoGenerate: barcodeSettings.autoGenerate && !data.barcode,
            prefix: barcodeSettings.prefix,
            excludeProductId: existing.id,
          });
          await tx.storeProduct.update({
            where: { id: existing.id },
            data: {
              title: data.title,
              slug: data.slug,
              sku: data.sku,
              barcode,
              categoryId: data.categoryId,
              brandId: data.brandId,
              collectionId: data.collectionId,
              priceMinor: data.priceMinor,
              compareAtMinor: data.compareAtMinor,
              costMinor: data.costMinor,
              stockQty: data.stockQty,
              lowStockThreshold: data.lowStockThreshold,
              weightGrams: data.weightGrams,
              desi: data.desi,
              imageUrl: data.imageUrl,
              badgesJson: data.badgesJson,
              published: data.published,
              seoTitle: data.seoTitle,
              seoDescription: data.seoDescription,
              description: data.description,
            },
          });
          await syncProductCategoryLinks(tx, existing.id, data.categoryIds);
        });
        updated++;
        results.push({ rowNum: row.rowNum, title: data.title, action: "updated" });
      } else {
        const dupSlug = await prisma.storeProduct.findFirst({
          where: { siteId: auth.siteId, slug: data.slug },
        });
        const finalSlug = dupSlug ? `${data.slug}-${Date.now().toString(36).slice(-4)}` : data.slug;

        await prisma.$transaction(async (tx) => {
          const barcode = await resolveProductBarcode(tx, auth.siteId, {
            barcode: data.barcode,
            autoGenerate: barcodeSettings.autoGenerate && !data.barcode,
            prefix: barcodeSettings.prefix,
          });
          const created = await tx.storeProduct.create({
            data: {
              siteId: auth.siteId,
              ...data,
              barcode,
              slug: finalSlug,
            },
          });
          await syncProductCategoryLinks(tx, created.id, data.categoryIds);
        });
        created++;
        results.push({ rowNum: row.rowNum, title: data.title, action: "created" });
      }
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : "Kayıt hatası";
      results.push({ rowNum: row.rowNum, title: data.title, action: "skipped", error: msg });
    }
  }

  return NextResponse.json({
    ok: true,
    summary: { total: parsed.length, created, updated, failed },
    results,
  });
}
