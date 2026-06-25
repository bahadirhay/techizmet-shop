import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { resizeImageBuffer } from "@/lib/image-resize";

export const dynamic = "force-dynamic";

function parseWidth(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("w") ?? req.nextUrl.searchParams.get("width") ?? "750";
  const n = Number(raw);
  if (!Number.isFinite(n)) return 750;
  return Math.min(2000, Math.max(48, Math.round(n)));
}

/** /uploads/... görselleri — mobil LCP için boyutlandırılmış çıktı */
export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src")?.trim();
  if (!src?.startsWith("/uploads/")) {
    return NextResponse.json({ error: "Geçersiz kaynak" }, { status: 400 });
  }

  const pathOnly = src.split("?")[0]!;
  const width = parseWidth(req);

  let body: Buffer;
  try {
    body = await readFile(join(process.cwd(), "public", pathOnly.replace(/^\//, "")));
  } catch {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  const ext = pathOnly.split(".").pop()?.toLowerCase() ?? "";
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : null;

  const resized = await resizeImageBuffer(body, width, mime);
  return new NextResponse(new Uint8Array(resized.body), {
    headers: {
      "Content-Type": resized.mimeType,
      "Content-Length": String(resized.body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
