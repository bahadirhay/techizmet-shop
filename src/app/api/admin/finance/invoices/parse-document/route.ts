import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { parseInvoiceDocument } from "@/lib/finance/parse-invoice-document";

export const maxDuration = 120;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Yüklenen fatura (PDF/görsel) belgesini yapay zeka ile okur ve forma doldurmak
 * için yapılandırılmış alanları döndürür. Kayıt YAPMAZ — kullanıcı kontrol edip
 * "Yeni fatura" formundan kendisi kaydeder.
 */
export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fatura dosyası gerekli (PDF/JPG/PNG)." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Dosya çok büyük (en fazla 15 MB)." }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const result = await parseInvoiceDocument(auth.siteId, { base64, mimeType });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ provider: result.provider, extracted: result.extracted });
}
