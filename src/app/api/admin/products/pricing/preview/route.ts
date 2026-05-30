import { NextResponse } from "next/server";
import {
  parseBulkPricingAdjustment,
  parseBulkPricingFilter,
  previewBulkPricing,
} from "@/lib/bulk-pricing";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { filter?: unknown; adjustment?: unknown };
  const filter = parseBulkPricingFilter(body.filter);
  const adjustment = parseBulkPricingAdjustment(body.adjustment);

  if (!filter) {
    return NextResponse.json(
      { error: "En az bir filtre seçin (kategori, koleksiyon, stok aralığı vb.)" },
      { status: 400 },
    );
  }
  if (!adjustment) {
    return NextResponse.json({ error: "Geçersiz fiyat kuralı" }, { status: 400 });
  }

  const preview = await previewBulkPricing(auth.siteId, filter, adjustment);
  return NextResponse.json(preview);
}
