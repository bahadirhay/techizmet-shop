import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  applyBulkPricing,
  parseBulkPricingAdjustment,
  parseBulkPricingFilter,
} from "@/lib/bulk-pricing";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    filter?: unknown;
    adjustment?: unknown;
    label?: string;
    confirm?: boolean;
  };

  if (!body.confirm) {
    return NextResponse.json({ error: "Onay gerekli (confirm: true)" }, { status: 400 });
  }

  const filter = parseBulkPricingFilter(body.filter);
  const adjustment = parseBulkPricingAdjustment(body.adjustment);

  if (!filter) {
    return NextResponse.json({ error: "En az bir filtre seçin" }, { status: 400 });
  }
  if (!adjustment) {
    return NextResponse.json({ error: "Geçersiz fiyat kuralı" }, { status: 400 });
  }

  const result = await applyBulkPricing(
    auth.siteId,
    auth.staffUserId,
    filter,
    adjustment,
    body.label,
  );

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/pricing");
  revalidatePath("/");

  return NextResponse.json({
    ok: true,
    batchId: result.batchId,
    changedCount: result.preview.changedCount,
    skippedCount: result.preview.skippedCount,
  });
}
