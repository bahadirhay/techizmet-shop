import { NextResponse } from "next/server";
import { saveUploadedImage, saveUploadedVideo } from "@/lib/admin/upload";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file gerekli" }, { status: 400 });
  }

  try {
    const isVideo = file.type.startsWith("video/");
    const saved = isVideo
      ? await saveUploadedVideo(auth.siteId, file)
      : await saveUploadedImage(auth.siteId, file);
    const row = await prisma.storeMedia.create({
      data: {
        siteId: auth.siteId,
        filename: saved.filename,
        url: saved.url,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
      },
    });
    return NextResponse.json({ ok: true, media: row });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Yükleme hatası" },
      { status: 400 },
    );
  }
}
