import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const nodes = await prisma.whatsAppBotNode.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return NextResponse.json({ nodes });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as {
    parentId?: string | null;
    label?: string;
    botReply?: string | null;
    messageTemplate?: string | null;
    published?: boolean;
  };

  const label = body.label?.trim();
  if (!label) {
    return NextResponse.json({ error: "Etiket gerekli" }, { status: 400 });
  }

  const parentId = body.parentId?.trim() || null;
  if (parentId) {
    const parent = await prisma.whatsAppBotNode.findFirst({
      where: { id: parentId, siteId: auth.siteId },
    });
    if (!parent) {
      return NextResponse.json({ error: "Üst düğüm bulunamadı" }, { status: 400 });
    }
  }

  const agg = await prisma.whatsAppBotNode.aggregate({
    where: { siteId: auth.siteId, parentId },
    _max: { sortOrder: true },
  });

  const row = await prisma.whatsAppBotNode.create({
    data: {
      siteId: auth.siteId,
      parentId,
      label: label.slice(0, 120),
      botReply: body.botReply?.trim().slice(0, 800) || null,
      messageTemplate: body.messageTemplate?.trim().slice(0, 800) || null,
      published: body.published !== false,
      sortOrder: (agg._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(row);
}
