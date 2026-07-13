import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { persistStoreMedia } from "@/lib/admin/store-media-persist";
import { saveImageBuffer } from "@/lib/admin/upload";
import { getDefaultSite } from "@/lib/site";

/** Local studio — görsel yükle (Bearer CRON_SECRET). */
export async function POST(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { sourceUrl?: string; dataUrl?: string; base64?: string; mimeType?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const site = await getDefaultSite();
  let buf: Buffer;
  let mime = (body.mimeType || "image/jpeg").trim();

  try {
    if (body.sourceUrl?.trim()) {
      const res = await fetch(body.sourceUrl.trim(), { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) {
        return NextResponse.json({ error: `Görsel indirilemedi: HTTP ${res.status}` }, { status: 400 });
      }
      buf = Buffer.from(await res.arrayBuffer());
      mime = res.headers.get("content-type")?.split(";")[0]?.trim() || mime;
    } else if (body.dataUrl?.trim()) {
      const match = body.dataUrl.trim().match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: "dataUrl formatı geçersiz" }, { status: 400 });
      }
      mime = match[1];
      buf = Buffer.from(match[2], "base64");
    } else if (body.base64?.trim()) {
      buf = Buffer.from(body.base64.trim(), "base64");
    } else {
      return NextResponse.json({ error: "sourceUrl, dataUrl veya base64 gerekli" }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Görsel okunamadı";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (buf.length > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Görsel en fazla 8 MB olabilir" }, { status: 400 });
  }

  const saved = await saveImageBuffer(site.id, buf, mime);
  const row = await persistStoreMedia(site.id, saved);
  const url = row.url.startsWith("/") ? row.url : `/api/media/${row.id}`;

  return NextResponse.json({
    ok: true,
    mediaId: row.id,
    url,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
  });
}
