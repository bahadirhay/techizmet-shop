import { NextResponse } from "next/server";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import { getProductPageBottomSettings } from "@/lib/product-page-bottom";
import { parseSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Ana sayfa kayan şerit — admin kaydından hemen (önbelleksiz) */
export async function GET() {
  const site = await getDefaultSite();
  const locale = await getStoreLocaleFromHeaders();
  const row = await prisma.storeSite.findUnique({ where: { id: site.id } });
  const settings = parseSiteSettings(row?.settingsJson ?? null);
  const marquee = getProductPageBottomSettings(settings, locale).marquee;

  return NextResponse.json(
    { marquee },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
