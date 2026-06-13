import { NextResponse } from "next/server";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { DEFAULT_BOT_SEED, DEFAULT_BOT_TITLE, DEFAULT_BOT_WELCOME } from "@/lib/whatsapp-bot";

export async function POST() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const existing = await prisma.whatsAppBotNode.count({ where: { siteId: auth.siteId } });
  if (existing > 0) {
    return NextResponse.json({ error: "Zaten bot düğümleri var" }, { status: 409 });
  }

  let order = 0;
  for (const root of DEFAULT_BOT_SEED) {
    const parent = await prisma.whatsAppBotNode.create({
      data: {
        siteId: auth.siteId,
        parentId: null,
        label: root.label,
        botReply: root.botReply ?? null,
        messageTemplate: root.messageTemplate ?? null,
        sortOrder: order++,
        published: true,
      },
    });
    if (root.children?.length) {
      let childOrder = 0;
      for (const child of root.children) {
        await prisma.whatsAppBotNode.create({
          data: {
            siteId: auth.siteId,
            parentId: parent.id,
            label: child.label,
            messageTemplate: child.messageTemplate,
            sortOrder: childOrder++,
            published: true,
          },
        });
      }
    }
  }

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const current = parseSiteSettings(site?.settingsJson ?? null);
  const merged = mergeSiteSettings(current, {
    whatsapp: {
      ...current.whatsapp,
      botTitle: DEFAULT_BOT_TITLE,
      botWelcome: DEFAULT_BOT_WELCOME,
    },
  });
  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(merged) },
  });
  revalidateStorePublicCache(auth.siteId);

  const nodes = await prisma.whatsAppBotNode.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }],
  });

  return NextResponse.json({ ok: true, nodes });
}
