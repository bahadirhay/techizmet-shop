import { NextResponse } from "next/server";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { loadActiveMarketplacePlatforms } from "@/lib/marketplace/active-integrations";
import { resolveProductCommission } from "@/lib/marketplace/commission-rules";
import { requireStaffApi } from "@/lib/staff-auth";

/** Aktif pazaryerleri için komisyon kurallarını tek istekte döner. */
export async function GET(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const categoryId = new URL(req.url).searchParams.get("categoryId")?.trim() || null;
  const platforms = await loadActiveMarketplacePlatforms(auth.siteId);
  const settings = await getCachedParsedSiteSettings(auth.siteId);

  const rules: Record<string, Awaited<ReturnType<typeof resolveProductCommission>>> = {};
  await Promise.all(
    platforms.map(async (p) => {
      rules[p.id] = await resolveProductCommission(auth.siteId, p.id, categoryId);
    }),
  );

  return NextResponse.json({
    rules,
    platforms,
    finance: {
      trendyolFixedFeeMinor: Math.max(0, settings.finance?.trendyolFixedFeeMinor ?? 0),
      packagingCostMinor: Math.max(0, settings.finance?.packagingCostMinor ?? 0),
    },
  });
}
