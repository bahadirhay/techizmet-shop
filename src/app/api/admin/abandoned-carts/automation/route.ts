import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { parseSiteSettings } from "@/lib/site-settings";

export async function GET() {
  const auth = await requireStaffApi("store.dashboard");
  if (auth instanceof NextResponse) return auth;
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  return NextResponse.json({ abandonedCart: settings.marketing?.abandonedCart ?? {} });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("store.dashboard");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as {
    enabled?: boolean;
    discountCode?: string;
  };

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const current = parseSiteSettings(site?.settingsJson ?? null);
  const merged = mergeSiteSettings(current, {
    marketing: {
      abandonedCart: {
        enabled: Boolean(body.enabled),
        discountCode: body.discountCode?.trim() || undefined,
      },
    },
  });
  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(merged) },
  });
  return NextResponse.json({ abandonedCart: merged.marketing?.abandonedCart ?? {} });
}
