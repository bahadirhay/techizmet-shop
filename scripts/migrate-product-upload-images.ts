/**
 * Ürün /uploads görsellerini /api/media'ya taşır ve sıralamayı düzeltir.
 * Kullanım: npx tsx scripts/migrate-product-upload-images.ts [slug]
 */
import { migrateUploadMediaItem } from "../src/lib/admin/migrate-upload-media";
import { syncProductMedia } from "../src/lib/admin/sync-product-media";
import { prisma } from "../src/lib/prisma";
async function main() {
  const slugArg = process.argv[2]?.trim();
  const products = await prisma.storeProduct.findMany({
    where: slugArg ? { slug: slugArg } : { images: { some: { url: { startsWith: "/uploads/" } } } },
    select: {
      id: true,
      slug: true,
      siteId: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!products.length) {
    console.log("Taşınacak /uploads görseli olan ürün yok.");
    return;
  }

  for (const product of products) {
    const mediaItems = product.images.map((img) => ({
      url: img.url,
      mediaType: img.mediaType === "video" ? ("video" as const) : ("image" as const),
    }));
    const migrated = await Promise.all(
      mediaItems.map((m) => migrateUploadMediaItem(prisma, product.siteId, m)),
    );
    const primary = await syncProductMedia(prisma, product.id, migrated, product.siteId);
    if (primary) {
      await prisma.$executeRaw`
        UPDATE shop.product SET "imageUrl" = ${primary} WHERE id = ${product.id}
      `;
    }
    console.log(`${product.slug}: imageUrl → ${primary}`);
    for (const img of migrated) console.log(`  - ${img.url}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
