import { NextResponse } from "next/server";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { parseSiteSettings, type SiteSettings } from "@/lib/site-settings";

export async function GET() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  return NextResponse.json({ settings: parseSiteSettings(site?.settingsJson ?? null) });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as SiteSettings;
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const merged = mergeSiteSettings(parseSiteSettings(site?.settingsJson ?? null), body);
  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(merged) },
  });
  revalidateStorePublicCache(auth.siteId);
  return NextResponse.json({ settings: merged });
}
