import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const conversations = await prisma.assistantConversation.findMany({
    where: { siteId: auth.siteId },
    orderBy: { lastMessageAt: "desc" },
    take: 40,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, role: true, layer: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({ conversations });
}
