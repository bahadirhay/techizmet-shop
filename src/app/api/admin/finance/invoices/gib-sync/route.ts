import { NextResponse } from "next/server";
import { syncInboundGibInvoices } from "@/lib/efatura/inbound-sync";
import { syncKdvObligation } from "@/lib/finance/kdv-sync";
import { syncGeciciObligations } from "@/lib/finance/gecici-sync";
import { getTaxConfig } from "@/lib/finance/tax";
import { parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export const maxDuration = 90;

export async function POST() {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const result = await syncInboundGibInvoices(auth.siteId, auth.staffUserId);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  // Yeni KDV girişleri oluşturulduysa beyanname yükümlülüklerini senkronize et
  if (result.kdvEntriesCreated > 0) {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const prevYear = currentYear - 1;

    const site = await prisma.storeSite.findUnique({
      where: { id: auth.siteId },
      select: { settingsJson: true },
    });
    const config = getTaxConfig(parseSiteSettings(site?.settingsJson ?? null));

    // Cari yıl ve önceki yılın tüm KDV aylarını senkronize et
    const syncPromises: Promise<void>[] = [];
    for (let m = 1; m <= 12; m++) {
      syncPromises.push(syncKdvObligation(auth.siteId, currentYear, m));
      syncPromises.push(syncKdvObligation(auth.siteId, prevYear, m));
    }
    await Promise.all(syncPromises);
    await Promise.all([
      syncGeciciObligations(auth.siteId, currentYear, config.incomeBrackets),
      syncGeciciObligations(auth.siteId, prevYear, config.incomeBrackets),
    ]);
  }

  return NextResponse.json(result);
}
