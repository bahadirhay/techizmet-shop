import { NextResponse } from "next/server";
import {
  deleteCommissionRule,
  listCommissionRules,
  upsertCommissionRule,
} from "@/lib/marketplace/commission-rules";
import { tryToMinor } from "@/lib/admin/money";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const platform = new URL(req.url).searchParams.get("platform")?.trim();
  if (!platform) {
    return NextResponse.json({ error: "platform gerekli" }, { status: 400 });
  }

  const rules = await listCommissionRules(auth.siteId, platform);
  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    platform?: string;
    categoryId?: string | null;
    commissionPercent?: number;
    extraCommissionPercent?: number;
    shippingModel?: string;
    shippingFeeMinor?: number | string;
    shippingFee?: string | number;
    notes?: string;
  };

  const platform = body.platform?.trim();
  if (!platform) {
    return NextResponse.json({ error: "platform gerekli" }, { status: 400 });
  }

  try {
    const rule = await upsertCommissionRule({
      siteId: auth.siteId,
      platform,
      categoryId: body.categoryId?.trim() || null,
      commissionPercent: body.commissionPercent ?? 15,
      extraCommissionPercent: body.extraCommissionPercent ?? 0,
      shippingModel: body.shippingModel ?? "marketplace_cargo",
      shippingFeeMinor: tryToMinor(body.shippingFeeMinor ?? body.shippingFee ?? 0),
      notes: body.notes,
    });
    return NextResponse.json({ ok: true, rule });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kayıt başarısız";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const ok = await deleteCommissionRule(auth.siteId, id);
  if (!ok) return NextResponse.json({ error: "Kural bulunamadı" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
