import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { cookieConsentLogsToCsv } from "@/lib/cookie-consent/service";

export async function GET(req: Request) {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const decision = url.searchParams.get("decision")?.trim() || "";
  const take = Math.min(Math.max(parseInt(url.searchParams.get("take") || "5000", 10) || 5000, 1), 20000);

  const rows = await prisma.cookieConsentLog.findMany({
    where: {
      siteId: auth.siteId,
      ...(decision ? { decision } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  const csv = cookieConsentLogsToCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cookie-consent-logs-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
