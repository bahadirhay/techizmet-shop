import { NextResponse } from "next/server";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { getEfaturaConfig, parseEfaturaSettings } from "@/lib/efatura/settings";
import { parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const settings = parseSiteSettings(site.settingsJson);
  const config = parseEfaturaSettings(settings.efatura);

  return NextResponse.json({
    efatura: {
      enabled: config.enabled,
      testMode: config.testMode,
      sellerTitle: config.sellerTitle,
      sellerTaxId: config.sellerTaxId,
      sellerTaxOffice: config.sellerTaxOffice,
      username: settings.efatura?.username ?? "",
      hasPassword: Boolean(process.env.GIB_PASSWORD || settings.efatura?.password),
      defaultConsumerTaxId: config.defaultConsumerTaxId,
      defaultVatRate: config.defaultVatRate,
      autoSign: config.autoSign,
      autoSendMarketplace: config.autoSendMarketplace,
      autoInvoiceOnShip: config.autoInvoiceOnShip,
    },
    envHint: "Parola için GIB_PASSWORD ortam değişkeni önerilir.",
  });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const body = (await req.json()) as { efatura?: SiteSettings["efatura"] };
  const current = parseSiteSettings(site.settingsJson);
  const patch = body.efatura ?? {};

  const nextEfatura: SiteSettings["efatura"] = {
    ...current.efatura,
    ...patch,
  };
  // Form boş parola gönderince kayıtlı şifreyi silme (SMTP ile aynı mantık)
  if (!patch.password?.trim()) {
    if (current.efatura?.password) nextEfatura.password = current.efatura.password;
    else delete nextEfatura.password;
  }

  const next = mergeSiteSettings(current, { efatura: nextEfatura });
  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(next) },
  });

  const config = await getEfaturaConfig(auth.siteId);
  return NextResponse.json({
    ok: true,
    efatura: {
      enabled: config.enabled,
      testMode: config.testMode,
      sellerTitle: config.sellerTitle,
      sellerTaxId: config.sellerTaxId,
      sellerTaxOffice: config.sellerTaxOffice,
      username: next.efatura?.username ?? "",
      hasPassword: Boolean(process.env.GIB_PASSWORD || next.efatura?.password),
      defaultConsumerTaxId: config.defaultConsumerTaxId,
      defaultVatRate: config.defaultVatRate,
      autoSign: config.autoSign,
      autoSendMarketplace: config.autoSendMarketplace,
    },
  });
}
