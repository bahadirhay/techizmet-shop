import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { resizeImageBuffer, toMarketplaceJpegBuffer } from "@/lib/image-resize";

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

function extensionForMime(mime: string): string | null {
  const m = mime.toLowerCase();
  if (m.includes("jpeg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("avif")) return "avif";
  return null;
}

/**
 * Neon DB'de saklanan medya — logo, ürün görseli, video vb.
 * /api/media/<id> ve /gorsel/<id>/<ad> aynı dosyayı sunar; `downloadName` verilirse
 * Content-Disposition'daki dosya adı yüklenen dosyanın adı yerine bu ad olur.
 */
export async function serveStoreMedia(
  req: NextRequest,
  rawId: string,
  opts?: { downloadName?: string },
): Promise<NextResponse> {
  const id = rawId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const row = await prisma.storeMedia.findUnique({
    where: { id },
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
    } else if (
      acceptsWebp &&
      !mimeType.includes("webp") &&
      // PNG logo/favicon — lossy WebP ince çizgileri bozar; orijinal kalsın
      !mimeType.includes("png")
    ) {
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

  const descriptive = opts?.downloadName?.replace(/["\\\r\n]/g, "").trim();
  if (descriptive) {
    // Adresteki uzantı saklanan biçime göredir; gönderilen biçim farklıysa (ör. WebP'ye çevrildi) düzeltilir
    const ext = extensionForMime(mimeType);
    const name = ext ? descriptive.replace(/\.[a-z0-9]+$/i, `.${ext}`) : descriptive;
    headers["Content-Disposition"] = `inline; filename="${name}"`;
  } else if (row.filename) {
    const safeName = row.filename.replace(/"/g, "");
    const dispositionName =
      amazonJpeg && mimeType === "image/jpeg"
        ? safeName.replace(/\.[^.]+$/i, ".jpg")
        : safeName;
    headers["Content-Disposition"] = `inline; filename="${dispositionName}"`;
  } else if (amazonJpeg && mimeType === "image/jpeg") {
    headers["Content-Disposition"] = `inline; filename="${id}.jpg"`;
  }

  return new NextResponse(new Uint8Array(out), { headers });
}
