import { NextResponse } from "next/server";
import {
  importAllMarketplaceFinance,
  importMarketplaceFinance,
  isFinanceImportPlatform,
} from "@/lib/finance/marketplace-finance-import";
import { logMarketplaceAction } from "@/lib/marketplace/actions";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { platform?: string; sinceDays?: number; all?: boolean };
  const sinceDays = Math.min(Math.max(Number(body.sinceDays ?? 30), 7), 90);

  if (body.all) {
    const active = await prisma.marketplaceIntegration.findMany({
      where: { siteId: auth.siteId, active: true },
      select: { platform: true },
    });
    const platforms = active
      .map((a) => a.platform)
      .filter((p) => isFinanceImportPlatform(p));

    if (platforms.length === 0) {
      return NextResponse.json({ error: "Aktif pazaryeri entegrasyonu yok" }, { status: 404 });
    }

    const results = await importAllMarketplaceFinance(auth.siteId, platforms, { sinceDays });
    for (const result of results) {
      await logMarketplaceAction(auth.siteId, result.platform, "import_finance", {
        ok: result.errors.length === 0,
        message: result.message,
        itemsCount: result.payouts.created + result.deductions.created,
      });
    }

    const message = results.map((r) => `${r.platform}: ${r.message}`).join(" · ");
    return NextResponse.json({ results, message });
  }

  const platform = String(body.platform ?? "").trim().toLowerCase();
  if (!isFinanceImportPlatform(platform)) {
    return NextResponse.json(
      { error: "Geçerli platform gerekli: trendyol, hepsiburada, amazon_tr" },
      { status: 400 },
    );
  }

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId: auth.siteId, platform, active: true },
  });
  if (!integration) {
    return NextResponse.json({ error: `Aktif ${platform} entegrasyonu bulunamadı` }, { status: 404 });
  }

  const result = await importMarketplaceFinance(auth.siteId, platform, { sinceDays });

  await logMarketplaceAction(auth.siteId, platform, "import_finance", {
    ok: result.errors.length === 0,
    message: result.message,
    itemsCount: result.payouts.created + result.deductions.created,
  });

  return NextResponse.json({ result });
}
