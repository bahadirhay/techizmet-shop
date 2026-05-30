import { NextResponse } from "next/server";
import { saveUploadedVideo } from "@/lib/admin/upload";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file gerekli" }, { status: 400 });
  }

  try {
    const saved = await saveUploadedVideo(auth.siteId, file);
    const row = await prisma.storeMedia.create({
      data: {
        siteId: auth.siteId,
        filename: saved.filename,
        url: saved.url,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
      },
    });
    return NextResponse.json({ ok: true, media: row, url: saved.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Yükleme hatası";
    const needsBlob = message.includes("Vercel Blob");
    return NextResponse.json({ error: message }, { status: needsBlob ? 503 : 400 });
  }
}
