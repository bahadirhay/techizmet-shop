import { NextResponse } from "next/server";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { getAssistantConfig, parseAssistantSettings } from "@/lib/assistant/settings";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import type { StoreAssistantSettings } from "@/lib/assistant/settings";

export async function GET() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const config = getAssistantConfig(settings, site?.name);
  const knowledgeCount = await prisma.assistantKnowledgeEntry.count({
    where: { siteId: auth.siteId, active: true },
  });
  return NextResponse.json({
    assistant: settings.assistant ?? {},
    resolved: config,
    knowledgeCount,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as StoreAssistantSettings;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const current = parseSiteSettings(site?.settingsJson ?? null);
  const merged = mergeSiteSettings(current, {
    assistant: {
      ...current.assistant,
      ...body,
      channels: body.channels
        ? { ...current.assistant?.channels, ...body.channels }
        : current.assistant?.channels,
    },
  });

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(merged) },
  });
  revalidateStorePublicCache(auth.siteId);

  const config = parseAssistantSettings(merged.assistant, site?.name);
  return NextResponse.json({ assistant: merged.assistant ?? {}, resolved: config });
}
