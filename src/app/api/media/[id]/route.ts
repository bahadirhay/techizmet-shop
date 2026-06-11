import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

/** Neon DB'de saklanan medya — logo, ürün görseli, video vb. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
  return new NextResponse(body, {
    headers: {
      "Content-Type": row.mimeType || "application/octet-stream",
      "Content-Length": String(row.sizeBytes ?? body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(row.filename ? { "Content-Disposition": `inline; filename="${row.filename.replace(/"/g, "")}"` } : {}),
    },
  });
}
