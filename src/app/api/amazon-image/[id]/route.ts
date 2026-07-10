import { NextResponse } from "next/server";
import { loadAmazonProductJpeg } from "@/lib/amazon-product-image";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Amazon listing görselleri — URL'de .jpg uzantısı (rewrite ile) veya düz id.
 * Locale çerezi eklenmez (proxy.ts).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const id = rawId.replace(/\.jpe?g$/i, "").trim();
  if (!id) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const body = await loadAmazonProductJpeg(id);
  if (!body?.length) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(body.length),
      "Content-Disposition": `inline; filename="${id}.jpg"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
