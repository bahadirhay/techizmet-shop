import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const rows = await prisma.cookieConsentLog.findMany({
    where: { siteId: auth.siteId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id,
      consentKey: r.consentKey,
      decision: r.decision,
      preferences: r.preferencesJson,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
