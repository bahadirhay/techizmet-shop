import { NextResponse } from "next/server";
import { loadStockLedger, loadStockSummary } from "@/lib/stock/report";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const stockItemId = url.searchParams.get("stockItemId") ?? undefined;
  const mode = url.searchParams.get("mode") ?? "ledger";

  if (mode === "summary") {
    const report = await loadStockSummary(auth.siteId, { from, to });
    return NextResponse.json(report);
  }

  const report = await loadStockLedger(auth.siteId, { from, to, stockItemId });
  return NextResponse.json(report);
}
