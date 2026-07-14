import { NextResponse } from "next/server";
import { issueOrderInvoice } from "@/lib/efatura/order-invoice";
import { closeGibSessionForSite } from "@/lib/efatura/gib-session";
import { requireStaffApi } from "@/lib/staff-auth";

// GİB işlemleri uzun sürebilir; yine de sonsuza kadar asılı kalmasın.
export const maxDuration = 60;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    recipientTaxId?: string;
    sign?: boolean;
    sendToMarketplace?: boolean;
    force?: boolean;
  };

  try {
    const result = await issueOrderInvoice(auth.siteId, id, body);
    if (!result.ok) {
      return NextResponse.json({ error: result.message, result }, { status: 400 });
    }
    return NextResponse.json({ result });
  } catch (err) {
    // Beklenmeyen hata — boş gövdeli 500 yerine her zaman JSON döndür ki
    // istemci "Unexpected end of JSON input" ile takılıp kalmasın.
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[order-invoice] issue failed:", err);
    return NextResponse.json(
      { error: `Fatura kesilemedi: ${msg}` },
      { status: 500 },
    );
  } finally {
    // GİB oturumunu kapat — sonraki isteğin (farklı sunucu IP'si) temiz giriş
    // yapabilmesi ve "aynı anda birden fazla giriş" hatasının önlenmesi için.
    await closeGibSessionForSite(auth.siteId);
  }
}
