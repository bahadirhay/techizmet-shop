import { NextResponse } from "next/server";
import {
  loadCartDiscountTiers,
  parseCartDiscountTiersBody,
  saveCartDiscountTiers,
} from "@/lib/admin/cart-discount-tiers";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("store.campaigns");
  if (auth instanceof NextResponse) return auth;
  const tiers = await loadCartDiscountTiers(auth.siteId);
  return NextResponse.json({ tiers });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("store.campaigns");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as Record<string, unknown>;
  const input = parseCartDiscountTiersBody(body);
  if (!input) {
    return NextResponse.json({ error: "Geçersiz form verisi" }, { status: 400 });
  }

  try {
    const tiers = await saveCartDiscountTiers(auth.siteId, input);
    return NextResponse.json({ ok: true, tiers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Kayıt başarısız";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
