import { NextResponse } from "next/server";
import { parseCampaignBody, validateCampaignData } from "@/lib/admin/campaign-parse";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("store.campaigns");
  if (auth instanceof NextResponse) return auth;
  const campaigns = await prisma.storeCampaign.findMany({
    where: { siteId: auth.siteId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.campaigns");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as Record<string, unknown>;
  const data = parseCampaignBody(body);
  if (!data.name) return NextResponse.json({ error: "Ad gerekli" }, { status: 400 });
  const validation = validateCampaignData(data);
  if (validation) return NextResponse.json({ error: validation }, { status: 400 });

  const campaign = await prisma.storeCampaign.create({
    data: { siteId: auth.siteId, ...data },
  });
  return NextResponse.json({ campaign });
}
