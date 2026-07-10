import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Amazon listing görselleri — URL'de .jpg uzantısı (Amazon crawler uyumu).
 * İçeride /api/media JPEG dönüşümünü kullanır; locale çerezi eklenmez.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const id = rawId.replace(/\.jpe?g$/i, "").trim();
  if (!id) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const mediaUrl = new URL(`/api/media/${encodeURIComponent(id)}`, origin);
  mediaUrl.searchParams.set("format", "jpeg");
  mediaUrl.searchParams.set("width", "1600");
  mediaUrl.searchParams.set("amazon", "1");

  const upstream = await fetch(mediaUrl.toString(), {
    headers: { Accept: "image/jpeg" },
    cache: "force-cache",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Dosya bulunamadı" },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const body = await upstream.arrayBuffer();
  const headers: Record<string, string> = {
    "Content-Type": "image/jpeg",
    "Content-Length": String(body.byteLength),
    "Content-Disposition": `inline; filename="${id}.jpg"`,
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  return new NextResponse(body, { headers });
}
