import { NextResponse } from "next/server";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import type { StoreWhatsAppSettings } from "@/lib/whatsapp-settings";

export async function GET() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  return NextResponse.json({ whatsapp: settings.whatsapp ?? {} });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as StoreWhatsAppSettings;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const current = parseSiteSettings(site?.settingsJson ?? null);
  const merged = mergeSiteSettings(current, {
    whatsapp: {
      ...current.whatsapp,
      ...(body.number !== undefined ? { number: body.number?.trim() || undefined } : {}),
      ...(body.defaultMessage !== undefined
        ? { defaultMessage: body.defaultMessage?.trim() || undefined }
        : {}),
      ...(body.botEnabled !== undefined ? { botEnabled: !!body.botEnabled } : {}),
      ...(body.botTitle !== undefined ? { botTitle: body.botTitle?.trim() || undefined } : {}),
      ...(body.botWelcome !== undefined
        ? { botWelcome: body.botWelcome?.trim() || undefined }
        : {}),
      ...(body.floatingEnabled !== undefined ? { floatingEnabled: !!body.floatingEnabled } : {}),
    },
  });

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(merged) },
  });
  revalidateStorePublicCache(auth.siteId);
  return NextResponse.json({ whatsapp: merged.whatsapp ?? {} });
}
