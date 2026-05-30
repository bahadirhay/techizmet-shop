import { NextResponse } from "next/server";
import { persistStoreMedia } from "@/lib/admin/store-media-persist";
import { saveUploadedVideo } from "@/lib/admin/upload";
import { requireStaffApi } from "@/lib/staff-auth";

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
    const row = await persistStoreMedia(auth.siteId, saved);
    return NextResponse.json({ ok: true, media: row, url: row.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Yükleme hatası" },
      { status: 400 },
    );
  }
}
