import { prisma } from "../src/lib/prisma";

const slug = process.argv[2] ?? "kurutulmus-dana-girtlak";

async function main() {
  const product = await prisma.storeProduct.findFirst({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      imageUrl: true,
      published: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  console.log(JSON.stringify(product, null, 2));

  if (product?.images.length) {
    for (const img of product.images) {
      if (img.url.startsWith("/api/media/")) {
        const id = img.url.replace("/api/media/", "");
        const media = await prisma.storeMedia.findUnique({
          where: { id },
          select: { id: true, url: true, mimeType: true, sizeBytes: true, data: true },
        });
        console.log(
          `media ${id}:`,
          media
            ? {
                url: media.url,
                mimeType: media.mimeType,
                sizeBytes: media.sizeBytes,
                hasData: Boolean(media.data?.length),
              }
            : "NOT FOUND",
        );
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
