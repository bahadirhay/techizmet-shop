import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resizeImageBuffer } from "@/lib/image-resize";
import sharp from "sharp";

export const dynamic = "force-dynamic";

async function readUploadsFile(url: string): Promise<Buffer | null> {
  const path = url.split("?")[0]?.trim();
  if (!path?.startsWith("/uploads/")) return null;
  try {
    return await readFile(join(process.cwd(), "public", path.replace(/^\//, "")));
  } catch {
    return null;
  }
}

function parseWidth(req: NextRequest): number | null {
  const raw = req.nextUrl.searchParams.get("width") ?? req.nextUrl.searchParams.get("w");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(2000, Math.max(48, Math.round(n)));
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

  const width = parseWidth(req);
  let out = body;
  let mimeType = row.mimeType || "application/octet-stream";
  const acceptsWebp = req.headers.get("accept")?.includes("image/webp") ?? false;

  if (mimeType.startsWith("image/") && !mimeType.includes("gif")) {
    if (width) {
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

  return new NextResponse(new Uint8Array(out), {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(out.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Vary": "Accept",
      ...(row.filename ? { "Content-Disposition": `inline; filename="${row.filename.replace(/"/g, "")}"` } : {}),
    },
  });
}
