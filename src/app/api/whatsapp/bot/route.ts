import { NextResponse } from "next/server";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { buildBotTree, DEFAULT_BOT_TITLE, DEFAULT_BOT_WELCOME } from "@/lib/whatsapp-bot";
import { getWhatsAppConfig } from "@/lib/whatsapp-settings";

export async function GET() {
  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const wa = getWhatsAppConfig(settings);

  if (!wa.botEnabled || !wa.digits) {
    return NextResponse.json({ enabled: false });
  }

  const rows = await prisma.whatsAppBotNode.findMany({
    where: { siteId: site.id, published: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: {
      id: true,
      parentId: true,
      label: true,
      botReply: true,
      messageTemplate: true,
      sortOrder: true,
      published: true,
    },
  });

  return NextResponse.json({
    enabled: true,
    title: wa.botTitle || DEFAULT_BOT_TITLE,
    welcome: wa.botWelcome || DEFAULT_BOT_WELCOME,
    defaultMessage: wa.defaultMessage,
    tree: buildBotTree(rows),
  });
}
