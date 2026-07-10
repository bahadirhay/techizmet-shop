import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { toMarketplaceJpegBuffer } from "@/lib/image-resize";

async function readUploadsFile(url: string): Promise<Buffer | null> {
  const path = url.split("?")[0]?.trim();
  if (!path?.startsWith("/uploads/")) return null;
  try {
    return await readFile(join(process.cwd(), "public", path.replace(/^\//, "")));
  } catch {
    return null;
  }
}

/** Amazon listing için ürün görseli — JPEG, en uzun kenar 1000–1600 px. */
export async function loadAmazonProductJpeg(id: string): Promise<Buffer | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;

  const row = await prisma.storeMedia.findUnique({
    where: { id: trimmed },
    select: { data: true, url: true, mimeType: true },
  });
  if (!row) return null;

  let body: Buffer | null = row.data?.length ? Buffer.from(row.data) : null;
  if (!body?.length && row.url) {
    body = await readUploadsFile(row.url);
  }
  if (!body?.length) return null;

  const mime = row.mimeType?.toLowerCase() ?? "";
  if (!mime.startsWith("image/") || mime.includes("gif")) return null;

  const jpeg = await toMarketplaceJpegBuffer(body, {
    minLongestSide: 1000,
    maxLongestSide: 1600,
  });
  return jpeg.body;
}
