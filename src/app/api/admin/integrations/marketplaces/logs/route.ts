import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const platform = new URL(req.url).searchParams.get("platform");
  const logs = await prisma.marketplaceSyncLog.findMany({
    where: {
      siteId: auth.siteId,
      ...(platform ? { platform } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ logs });
}
