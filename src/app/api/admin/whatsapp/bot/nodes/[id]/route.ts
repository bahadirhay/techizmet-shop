import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

type Ctx = { params: Promise<{ id: string }> };

function trimOrNull(v: unknown, max: number): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const prev = await prisma.whatsAppBotNode.findFirst({ where: { id, siteId: auth.siteId } });
  if (!prev) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const body = (await req.json()) as {
    label?: string;
    botReply?: string | null;
    messageTemplate?: string | null;
    published?: boolean;
    sortOrder?: number;
  };

  const data: {
    label?: string;
    botReply?: string | null;
    messageTemplate?: string | null;
    published?: boolean;
    sortOrder?: number;
  } = {};

  const label = trimOrNull(body.label, 120);
  if (label !== undefined) {
    if (!label) return NextResponse.json({ error: "Etiket boş olamaz" }, { status: 400 });
    data.label = label;
  }
  const botReply = trimOrNull(body.botReply, 800);
  if (botReply !== undefined) data.botReply = botReply;
  const messageTemplate = trimOrNull(body.messageTemplate, 800);
  if (messageTemplate !== undefined) data.messageTemplate = messageTemplate;
  if (body.published !== undefined) data.published = !!body.published;
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);

  const row = await prisma.whatsAppBotNode.update({ where: { id }, data });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const node = await prisma.whatsAppBotNode.findFirst({ where: { id, siteId: auth.siteId } });
  if (!node) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const childIds = await prisma.whatsAppBotNode.findMany({
    where: { siteId: auth.siteId, parentId: id },
    select: { id: true },
  });
  for (const c of childIds) {
    await prisma.whatsAppBotNode.deleteMany({ where: { siteId: auth.siteId, parentId: c.id } });
  }
  await prisma.whatsAppBotNode.deleteMany({ where: { siteId: auth.siteId, parentId: id } });
  await prisma.whatsAppBotNode.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
