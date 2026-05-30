import { NextResponse } from "next/server";
import {
  DEFAULT_TARGET_MARGIN_PERCENT,
  suggestMarketplacePriceMinor,
} from "@/lib/marketplace/commission-types";
import { resolveProductCommission } from "@/lib/marketplace/commission-rules";
import { tryToMinor } from "@/lib/admin/money";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform")?.trim();
  const categoryId = url.searchParams.get("categoryId")?.trim() || null;
  const costMinor = tryToMinor(url.searchParams.get("cost"));
  const targetMargin = parseFloat(url.searchParams.get("targetMargin") ?? "") || DEFAULT_TARGET_MARGIN_PERCENT;

  if (!platform) {
    return NextResponse.json({ error: "platform gerekli" }, { status: 400 });
  }

  const rule = await resolveProductCommission(auth.siteId, platform, categoryId);
  const suggestedMinor =
    costMinor > 0
      ? suggestMarketplacePriceMinor({
          costMinor,
          targetMarginPercent: targetMargin,
          commissionPercent: rule.commissionPercent,
          shippingFeeMinor: rule.shippingModel === "marketplace_cargo" ? rule.shippingFeeMinor : 0,
        })
      : null;

  return NextResponse.json({
    rule,
    suggestedMinor,
    targetMarginPercent: targetMargin,
  });
}
