import type { NextRequest } from "next/server";
import { serveStoreMedia } from "@/lib/media-serve";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Açıklayıcı görsel adresi: /gorsel/<mediaId>/<urun-adi>-1.webp
 * Dosya mediaId ile bulunur; addaki metin yalnızca adresi anlamlı kılar
 * (bkz. src/lib/media-descriptive-url.ts). ?width= ile yeniden boyutlandırma aynen çalışır.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ mediaId: string; name: string }> },
) {
  const { mediaId, name } = await ctx.params;
  let downloadName = name;
  try {
    downloadName = decodeURIComponent(name);
  } catch {
    /* ham ad kullanılır */
  }
  return serveStoreMedia(req, mediaId, { downloadName });
}
