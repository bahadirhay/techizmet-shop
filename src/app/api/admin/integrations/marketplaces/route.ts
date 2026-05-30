import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const items = await prisma.marketplaceIntegration.findMany({
    where: { siteId: auth.siteId },
    orderBy: { platform: "asc" },
  });
  return NextResponse.json({ integrations: items });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as Record<string, unknown>;
  const platform = String(body.platform ?? "").trim().toLowerCase();
  const label = String(body.label ?? "").trim();
  if (!platform || !label) {
    return NextResponse.json({ error: "Platform ve etiket gerekli" }, { status: 400 });
  }

  const config =
    body.config && typeof body.config === "object" ? JSON.stringify(body.config) : null;

  const row = await prisma.marketplaceIntegration.upsert({
    where: { siteId_platform: { siteId: auth.siteId, platform } },
    create: {
      siteId: auth.siteId,
      platform,
      label,
      active: Boolean(body.active),
      configJson: config,
    },
    update: {
      label,
      active: Boolean(body.active),
      configJson: config,
    },
  });
  return NextResponse.json({ integration: row });
}
