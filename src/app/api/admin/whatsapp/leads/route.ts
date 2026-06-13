import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const status = url.searchParams.get("status")?.trim();
  const limitRaw = Number(url.searchParams.get("limit") ?? "80");
  const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, limitRaw)) : 80;

  const leads = await prisma.whatsAppLead.findMany({
    where: {
      siteId: auth.siteId,
      ...(status && status !== "all" ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const counts = await prisma.whatsAppLead.groupBy({
    by: ["status"],
    where: { siteId: auth.siteId },
    _count: { _all: true },
  });

  return NextResponse.json({ leads, counts });
}
