import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Neon DB'de saklanan medya — logo, ürün görseli, video vb. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const row = await prisma.storeMedia.findUnique({
    where: { id: id.trim() },
    select: { data: true, mimeType: true, filename: true, sizeBytes: true },
  });

  if (!row?.data?.length) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  const body = Buffer.from(row.data);
  return new NextResponse(body, {
    headers: {
      "Content-Type": row.mimeType || "application/octet-stream",
      "Content-Length": String(row.sizeBytes ?? body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(row.filename ? { "Content-Disposition": `inline; filename="${row.filename.replace(/"/g, "")}"` } : {}),
    },
  });
}
