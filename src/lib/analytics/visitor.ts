import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { UtmAttribution } from "@/lib/analytics/types";
import { newVisitorKey, VISITOR_COOKIE, visitorCookieOptions } from "@/lib/analytics/visitor-cookie";

function deviceTypeFromUa(ua: string | null): string | null {
  if (!ua) return null;
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) return "mobile";
  if (/Tablet/i.test(ua)) return "tablet";
  return "desktop";
}

export async function readVisitorKey(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get(VISITOR_COOKIE)?.value?.trim();
  return v || null;
}

export async function ensureVisitorProfile(
  siteId: string,
  opts?: {
    visitorKey?: string | null;
    customerId?: string | null;
    userAgent?: string | null;
    utm?: UtmAttribution;
  },
): Promise<{ visitorKey: string; isNew: boolean }> {
  let visitorKey = opts?.visitorKey?.trim() || (await readVisitorKey());
  let isNew = false;

  if (!visitorKey) {
    visitorKey = newVisitorKey();
    isNew = true;
    const jar = await cookies();
    jar.set(VISITOR_COOKIE, visitorKey, visitorCookieOptions());
  }

  const ua = opts?.userAgent ?? null;
  const deviceType = deviceTypeFromUa(ua);

  await prisma.visitorProfile.upsert({
    where: { siteId_visitorKey: { siteId, visitorKey } },
    create: {
      siteId,
      visitorKey,
      customerId: opts?.customerId ?? null,
      userAgent: ua,
      deviceType,
      utmSource: opts?.utm?.utmSource ?? null,
      utmMedium: opts?.utm?.utmMedium ?? null,
      utmCampaign: opts?.utm?.utmCampaign ?? null,
    },
    update: {
      lastSeenAt: new Date(),
      ...(opts?.customerId ? { customerId: opts.customerId } : {}),
      ...(ua ? { userAgent: ua } : {}),
      ...(deviceType ? { deviceType } : {}),
      ...(opts?.utm?.utmSource ? { utmSource: opts.utm.utmSource } : {}),
      ...(opts?.utm?.utmMedium ? { utmMedium: opts.utm.utmMedium } : {}),
      ...(opts?.utm?.utmCampaign ? { utmCampaign: opts.utm.utmCampaign } : {}),
    },
  });

  return { visitorKey, isNew };
}

export async function linkVisitorToCustomer(
  siteId: string,
  visitorKey: string,
  customerId: string,
): Promise<void> {
  await prisma.visitorProfile.updateMany({
    where: { siteId, visitorKey },
    data: { customerId, lastSeenAt: new Date() },
  });
}
