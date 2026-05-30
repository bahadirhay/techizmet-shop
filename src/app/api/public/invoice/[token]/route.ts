import { NextResponse } from "next/server";
import { getPublicInvoiceHtml } from "@/lib/efatura/order-invoice";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token?.trim()) {
    return NextResponse.json({ error: "Geçersiz bağlantı" }, { status: 400 });
  }

  const html = await getPublicInvoiceHtml(token.trim());
  if (!html) {
    return NextResponse.json({ error: "Fatura bulunamadı" }, { status: 404 });
  }

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
