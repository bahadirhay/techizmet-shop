import { NextResponse } from "next/server";
import { importMarketplaceFinance } from "@/lib/finance/marketplace-finance-import";
import { logMarketplaceAction } from "@/lib/marketplace/actions";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { sinceDays?: number };
  const sinceDays = Math.min(Math.max(Number(body.sinceDays ?? 30), 7), 90);

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId: auth.siteId, platform: "trendyol", active: true },
  });
  if (!integration) {
    return NextResponse.json(
      { error: "Aktif Trendyol entegrasyonu bulunamadı" },
      { status: 404 },
    );
  }

  const result = await importMarketplaceFinance(auth.siteId, "trendyol", { sinceDays });

  await logMarketplaceAction(auth.siteId, "trendyol", "import_finance", {
    ok: result.errors.length === 0,
    message: result.message,
    itemsCount: result.payouts.created + result.deductions.created,
  });

  return NextResponse.json({ result });
}
