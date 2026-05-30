import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { DEFAULT_STORE_NAV } from "@/lib/store-navigation";
import { parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const settings: SiteSettings = {
    ...parseSiteSettings(site.settingsJson),
    theme: {
      ...parseSiteSettings(site.settingsJson).theme,
      navItems: DEFAULT_STORE_NAV,
    },
  };

  await prisma.storeSite.update({
    where: { id: site.id },
    data: { settingsJson: JSON.stringify(settings) },
  });

  return NextResponse.json({ items: DEFAULT_STORE_NAV });
}
