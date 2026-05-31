import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

export function productAdminErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "Güncelleme başarısız";

  if (msg.includes("Geçersiz kategori")) {
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (msg.includes("Unique constraint") && msg.toLowerCase().includes("slug")) {
    return NextResponse.json({ error: "Bu URL slug zaten kullanılıyor." }, { status: 409 });
  }
  if (msg.includes("Transaction not found") || msg.includes("Transaction API error")) {
    return NextResponse.json(
      { error: "Veritabanı bağlantısı zaman aşımına uğradı. Lütfen tekrar deneyin." },
      { status: 503 },
    );
  }
  if (
    msg.includes("product_category") ||
    msg.includes("does not exist") ||
    msg.includes("highlightsJson")
  ) {
    return NextResponse.json(
      {
        error:
          "Veritabanı şeması güncel değil. npm run db:migrate-product-categories ve npm run db:migrate-highlights komutlarını çalıştırın.",
      },
      { status: 503 },
    );
  }

  console.error("[admin/products] save failed:", e);
  return NextResponse.json({ error: msg }, { status: 500 });
}

export function isPrismaClientError(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return Boolean(e && typeof e === "object" && "code" in e);
}
