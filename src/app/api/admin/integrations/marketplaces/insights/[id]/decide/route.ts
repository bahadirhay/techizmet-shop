import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { executeInsightAction } from "@/lib/admin/store-insights/actions";

export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as { decision?: string };
  const decision = body.decision === "approve" ? "approved" : body.decision === "reject" ? "rejected" : null;
  if (!decision) {
    return NextResponse.json({ error: "decision 'approve' veya 'reject' olmalı" }, { status: 400 });
  }

  const insight = await prisma.storePerformanceInsight.findFirst({ where: { id, siteId: auth.siteId } });
  if (!insight) return NextResponse.json({ error: "Öneri bulunamadı" }, { status: 404 });
  if (insight.status !== "pending") {
    return NextResponse.json({ error: "Bu öneri zaten karara bağlanmış" }, { status: 400 });
  }

  await prisma.storePerformanceInsight.update({
    where: { id },
    data: { status: decision, decidedAt: new Date(), decidedBy: auth.username },
  });

  if (decision !== "approved" || insight.actionType !== "instagram_post") {
    return NextResponse.json({ ok: true, status: decision });
  }

  // Sadece Instagram gönderi önerisi onaylandığında canlı bir aksiyon tetiklenir.
  const result = await executeInsightAction(auth.siteId, id);
  await prisma.storePerformanceInsight.update({
    where: { id },
    data: result.ok
      ? { status: "executed", executedAt: new Date() }
      : { status: "failed", executionError: result.message },
  });

  return NextResponse.json({ ok: result.ok, status: result.ok ? "executed" : "failed", message: result.message });
}
