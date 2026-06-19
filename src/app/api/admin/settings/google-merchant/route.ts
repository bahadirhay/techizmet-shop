import { NextResponse } from "next/server";
import { googleMerchantFeedUrl } from "@/lib/seo/google-merchant-feed";
import { parseGoogleMerchantSettings } from "@/lib/seo/google-merchant-types";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function toClientState(
  settings: SiteSettings["googleMerchant"],
  siteName: string,
) {
  const resolved = parseGoogleMerchantSettings(settings, siteName);
  return {
    enabled: resolved.enabled,
    googleProductCategory: resolved.googleProductCategory,
    currency: resolved.currency,
    defaultBrand: resolved.defaultBrand,
    condition: resolved.condition,
    shippingCountry: resolved.shippingCountry,
    shippingPriceMinor: resolved.shippingPriceMinor,
    feedToken: "",
    hasFeedToken: Boolean(settings?.feedToken?.trim()),
    feedUrl: googleMerchantFeedUrl(resolved.feedToken || undefined),
    feedUrlPublic: googleMerchantFeedUrl(),
  };
}

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const settings = parseSiteSettings(site.settingsJson);
  return NextResponse.json({
    googleMerchant: toClientState(settings.googleMerchant, site.name),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const body = (await req.json()) as { googleMerchant?: SiteSettings["googleMerchant"] };
  const current = parseSiteSettings(site.settingsJson);
  const patch = body.googleMerchant ?? {};

  const nextGmc: SiteSettings["googleMerchant"] = { ...current.googleMerchant, ...patch };
  if (patch.feedToken === "") delete nextGmc?.feedToken;

  const next = mergeSiteSettings(current, { googleMerchant: nextGmc });
  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(next) },
  });

  return NextResponse.json({
    ok: true,
    googleMerchant: toClientState(next.googleMerchant, site.name),
  });
}
