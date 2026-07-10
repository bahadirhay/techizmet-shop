import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resizeImageBuffer, toMarketplaceJpegBuffer } from "@/lib/image-resize";
import sharp from "sharp";

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

function parseWidth(req: NextRequest, opts?: { min?: number; max?: number }): number | null {
  const raw = req.nextUrl.searchParams.get("width") ?? req.nextUrl.searchParams.get("w");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const min = opts?.min ?? 48;
  const max = opts?.max ?? 2000;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function wantsAmazonJpeg(req: NextRequest): boolean {
  const format = (req.nextUrl.searchParams.get("format") ?? req.nextUrl.searchParams.get("fm") ?? "")
    .toLowerCase()
    .trim();
  return format === "jpeg" || format === "jpg" || req.nextUrl.searchParams.get("amazon") === "1";
}

/** Neon DB'de saklanan medya — logo, ürün görseli, video vb. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const row = await prisma.storeMedia.findUnique({
    where: { id: id.trim() },
    select: { data: true, mimeType: true, filename: true, sizeBytes: true, url: true },
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

  const amazonJpeg = wantsAmazonJpeg(req);
  const width = parseWidth(req, amazonJpeg ? { min: 1000, max: 2500 } : undefined);
  let out = body;
  let mimeType = row.mimeType || "application/octet-stream";
  const acceptsWebp = req.headers.get("accept")?.includes("image/webp") ?? false;

  if (mimeType.startsWith("image/") && !mimeType.includes("gif")) {
    if (amazonJpeg) {
      const targetLong = width ?? 1600;
      const jpeg = await toMarketplaceJpegBuffer(body, {
        minLongestSide: 1000,
        maxLongestSide: Math.max(1000, Math.min(2500, targetLong)),
      });
      out = jpeg.body;
      mimeType = jpeg.mimeType;
    } else if (width) {
      const resized = await resizeImageBuffer(body, width, mimeType);
      out = resized.body;
      mimeType = resized.mimeType;
    } else if (acceptsWebp && !mimeType.includes("webp")) {
      out = await sharp(body).rotate().webp({ quality: 82 }).toBuffer();
      mimeType = "image/webp";
    }
  } else if (width && mimeType.startsWith("image/")) {
    const resized = await resizeImageBuffer(body, width, mimeType);
    out = resized.body;
    mimeType = resized.mimeType;
  }

  const headers: Record<string, string> = {
    "Content-Type": mimeType,
    "Content-Length": String(out.length),
    "Cache-Control": "public, max-age=31536000, immutable",
  };
  if (!amazonJpeg) headers.Vary = "Accept";
  if (row.filename) {
    const safeName = row.filename.replace(/"/g, "");
    const dispositionName =
      amazonJpeg && mimeType === "image/jpeg"
        ? safeName.replace(/\.[^.]+$/i, ".jpg")
        : safeName;
    headers["Content-Disposition"] = `inline; filename="${dispositionName}"`;
  } else if (amazonJpeg && mimeType === "image/jpeg") {
    headers["Content-Disposition"] = `inline; filename="${id.trim()}.jpg"`;
  }

  return new NextResponse(new Uint8Array(out), { headers });
}
