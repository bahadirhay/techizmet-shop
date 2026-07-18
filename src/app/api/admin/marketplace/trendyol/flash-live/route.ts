import { NextResponse } from "next/server";
import { loadTrendyolFlashLiveData } from "@/lib/marketplace/trendyol/flash-live-data";
import { requireStaffApi } from "@/lib/staff-auth";

/** Flash simülatörü — Trendyol canlı fiyat + settlement efektif komisyon. */
export async function GET(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const productId = url.searchParams.get("productId")?.trim() || null;
  const barcode = url.searchParams.get("barcode")?.trim() || null;
  const categoryId = url.searchParams.get("categoryId")?.trim() || null;

  if (!productId && !barcode) {
    return NextResponse.json({ error: "productId veya barcode gerekli" }, { status: 400 });
  }

  const data = await loadTrendyolFlashLiveData({
    siteId: auth.siteId,
    productId,
    barcode,
    categoryId,
  });

  return NextResponse.json(data);
}
