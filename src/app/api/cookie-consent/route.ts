import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { parseCookieConsentConfig } from "@/lib/cookie-consent/config";
import { parseSiteSettings } from "@/lib/site-settings";

const schema = z.object({
  consentKey: z.string().min(8).max(120),
  decision: z.enum(["accepted", "rejected", "custom", "withdrawn"]),
  preferences: z.record(z.string(), z.boolean()).optional(),
  policyVersion: z.string().min(1).max(40).optional(),
  source: z.enum(["banner", "settings", "reconsent", "withdrawn"]).optional(),
  locale: z.string().min(2).max(12).optional(),
});

function readIp(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf?.trim()) return xf.split(",")[0]?.trim() || null;
  return null;
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Geçersiz çerez verisi." }, { status: 400 });
  }

  const site = await getDefaultSite();
  const settings = parseSiteSettings(site.settingsJson);
  const cfg = parseCookieConsentConfig(settings.cookieConsentJson);
  const body = parsed.data;

  await prisma.cookieConsentLog.create({
    data: {
      siteId: site.id,
      consentKey: body.consentKey,
      decision: body.decision,
      preferencesJson: body.preferences ? JSON.stringify(body.preferences) : null,
      policyVersion: body.policyVersion?.trim() || cfg.policyVersion || null,
      source: body.source ?? "banner",
      locale: body.locale?.trim() || null,
      ipAddress: readIp(req),
      userAgent: req.headers.get("user-agent"),
    },
  });

  return NextResponse.json({ ok: true, policyVersion: cfg.policyVersion });
}
