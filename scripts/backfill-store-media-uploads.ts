/**
 * storeMedia satırlarında url=/uploads/... ama data boş olanları yerel dosyadan doldurur.
 * Canlıda çalıştırmak için dosyayı önce yükleyip /api/media kullanın.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { storeMediaPublicUrl } from "../src/lib/admin/store-media-persist";
import { prisma } from "../src/lib/prisma";

async function main() {
  const rows = await prisma.storeMedia.findMany({
    where: { url: { startsWith: "/uploads/" } },
    select: { id: true, url: true, data: true, siteId: true },
  });

  let fixed = 0;
  for (const row of rows) {
    if (row.data?.length) continue;
    const path = row.url.split("?")[0]!;
    try {
      const buf = await readFile(join(process.cwd(), "public", path.replace(/^\//, "")));
      const apiUrl = storeMediaPublicUrl(row.id);
      await prisma.storeMedia.update({
        where: { id: row.id },
        data: {
          data: new Uint8Array(buf),
          sizeBytes: buf.length,
          url: apiUrl,
        },
      });
      console.log(`OK ${row.id} → ${apiUrl} (${buf.length} bytes)`);
      fixed++;
    } catch {
      console.log(`SKIP ${row.id} — yerel dosya yok: ${path}`);
    }
  }
  console.log(`Tamamlandı: ${fixed}/${rows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
