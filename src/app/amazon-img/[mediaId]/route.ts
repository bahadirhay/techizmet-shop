import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toMarketplaceJpegBuffer } from "@/lib/image-resize";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function readUploadsFile(url: string): Promise<Buffer | null> {
  const path = url.split("?")[0]?.trim();
  if (!path?.startsWith("/uploads/")) return null;
  try {
    return await readFile(join(process.cwd(), "public", path.replace(/^\//, "")));
  } catch {
    return null;
  }
}

/** Amazon listing görselleri — JPEG, çerezsiz, /amazon-img/:id */
export async function GET(_req: Request, ctx: { params: Promise<{ mediaId: string }> }) {
  const { mediaId: rawId } = await ctx.params;
  const id = rawId.replace(/\.jpe?g$/i, "").trim();
  if (!id) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const row = await prisma.storeMedia.findUnique({
    where: { id },
    select: { data: true, mimeType: true, url: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  let body: Buffer | null = row.data?.length ? Buffer.from(row.data) : null;
  if (!body?.length && row.url) {
    body = await readUploadsFile(row.url);
  }
  if (!body?.length) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  const mime = row.mimeType?.toLowerCase() ?? "";
  if (!mime.startsWith("image/") || mime.includes("gif")) {
    return NextResponse.json({ error: "Desteklenmeyen görsel" }, { status: 415 });
  }

  const jpeg = await toMarketplaceJpegBuffer(body, {
    minLongestSide: 1000,
    maxLongestSide: 1600,
  });

  return new NextResponse(new Uint8Array(jpeg.body), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(jpeg.body.length),
      "Content-Disposition": `inline; filename="${id}.jpg"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
