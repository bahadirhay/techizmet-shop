import { NextRequest, NextResponse } from "next/server";
import { resizeImageBuffer, toMarketplaceJpegBuffer } from "@/lib/image-resize";
import { loadMirrorResizeSourceBytes } from "@/lib/mirror-resize-load";
import { normalizeMirrorResizeSrc } from "@/lib/mirror-resize-src";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function parseWidth(req: NextRequest, amazonJpeg: boolean): number {
  const raw = req.nextUrl.searchParams.get("w") ?? req.nextUrl.searchParams.get("width") ?? (amazonJpeg ? "1600" : "750");
  const n = Number(raw);
  if (!Number.isFinite(n)) return amazonJpeg ? 1600 : 750;
  const max = amazonJpeg ? 2500 : 2000;
  const min = amazonJpeg ? 1000 : 48;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function wantsAmazonJpeg(req: NextRequest): boolean {
  const format = (req.nextUrl.searchParams.get("format") ?? req.nextUrl.searchParams.get("fm") ?? "")
    .toLowerCase()
    .trim();
  return format === "jpeg" || format === "jpg" || req.nextUrl.searchParams.get("amazon") === "1";
}

/** /uploads ve tema CDN raster görselleri — boyutlandırılmış WebP veya Amazon JPEG çıktı */
export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src")?.trim();
  const pathOnly = src ? normalizeMirrorResizeSrc(src) : null;
  if (!pathOnly) {
    return NextResponse.json({ error: "Geçersiz kaynak" }, { status: 400 });
  }

  const amazonJpeg = wantsAmazonJpeg(req);
  const width = parseWidth(req, amazonJpeg);

  const body = await loadMirrorResizeSourceBytes(pathOnly, req);
  if (!body?.length) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  const ext = pathOnly.split(".").pop()?.toLowerCase() ?? "";
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : null;

  let out: Buffer;
  let mimeType: string;
  if (amazonJpeg) {
    const jpeg = await toMarketplaceJpegBuffer(body, {
      minLongestSide: 1000,
      maxLongestSide: Math.max(1000, Math.min(2500, width)),
    });
    out = jpeg.body;
    mimeType = jpeg.mimeType;
  } else {
    const resized = await resizeImageBuffer(body, width, mime);
    out = resized.body;
    mimeType = resized.mimeType;
  }

  const baseName = pathOnly.split("/").pop()?.replace(/\.[^.]+$/i, "") || "image";
  const filename = amazonJpeg ? `${baseName}.jpg` : pathOnly.split("/").pop() || "image";

  return new NextResponse(new Uint8Array(out), {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(out.length),
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
