import { NextResponse } from "next/server";
import { parseCampaignBody, validateCampaignData } from "@/lib/admin/campaign-parse";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.campaigns");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const campaign = await prisma.storeCampaign.findFirst({ where: { id, siteId: auth.siteId } });
  if (!campaign) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.campaigns");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeCampaign.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const data = parseCampaignBody(body, true);
  const validation = validateCampaignData({
    type: data.type ?? existing.type,
    buyQuantity: data.buyQuantity !== undefined ? data.buyQuantity : existing.buyQuantity,
    payQuantity: data.payQuantity !== undefined ? data.payQuantity : existing.payQuantity,
    autoApply: data.autoApply !== undefined ? data.autoApply : existing.autoApply,
    code: data.code !== undefined ? data.code : existing.code,
  });
  if (validation) return NextResponse.json({ error: validation }, { status: 400 });
  const campaign = await prisma.storeCampaign.update({ where: { id }, data });
  return NextResponse.json({ campaign });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.campaigns");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const existing = await prisma.storeCampaign.findFirst({ where: { id, siteId: auth.siteId } });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  await prisma.storeCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
