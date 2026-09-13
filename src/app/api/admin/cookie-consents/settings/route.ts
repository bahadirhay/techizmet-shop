import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { mergeCookieConsentConfigPatch, parseCookieConsentConfig } from "@/lib/cookie-consent/config";

const patchSchema = z.object({
  policyVersion: z.string().min(1).max(40).optional(),
  retentionDays: z.number().int().min(30).max(3650).optional(),
  reconsentDays: z.number().int().min(0).max(3650).optional(),
  enabled: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({
    where: { id: auth.siteId },
    select: { settingsJson: true },
  });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const cfg = parseCookieConsentConfig(settings.cookieConsentJson);
  return NextResponse.json({
    config: {
      policyVersion: cfg.policyVersion,
      retentionDays: cfg.retentionDays,
      reconsentDays: cfg.reconsentDays,
      enabled: cfg.enabled !== false,
    },
  });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const body = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz ayar" }, { status: 400 });
  }

  const site = await prisma.storeSite.findUnique({
    where: { id: auth.siteId },
    select: { settingsJson: true },
  });
  const current = parseSiteSettings(site?.settingsJson ?? null);
  const nextJson = mergeCookieConsentConfigPatch(current.cookieConsentJson, body.data);
  const merged = mergeSiteSettings(current, { cookieConsentJson: nextJson });

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(merged) },
  });

  const cfg = parseCookieConsentConfig(nextJson);
  return NextResponse.json({
    ok: true,
    config: {
      policyVersion: cfg.policyVersion,
      retentionDays: cfg.retentionDays,
      reconsentDays: cfg.reconsentDays,
      enabled: cfg.enabled !== false,
    },
  });
}
