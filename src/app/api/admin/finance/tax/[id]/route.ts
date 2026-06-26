import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

type PatchBody = {
  status?: "bekliyor" | "beyan_edildi" | "odendi";
  baseMinor?: number;
  taxMinor?: number;
  stampDutyMinor?: number;
  paidMinor?: number;
  dueDate?: string;
  notes?: string | null;
};

function intOrUndef(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : undefined;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;

  const existing = await prisma.taxObligation.findFirst({
    where: { id, siteId: auth.siteId },
  });
  if (!existing) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (body.status && ["bekliyor", "beyan_edildi", "odendi"].includes(body.status)) {
    data.status = body.status;
    // Durum geçişlerinde tarihleri otomatik damgala
    if (body.status === "beyan_edildi" && !existing.declaredAt) data.declaredAt = new Date();
    if (body.status === "odendi") {
      if (!existing.declaredAt) data.declaredAt = new Date();
      data.paidAt = new Date();
    }
    if (body.status === "bekliyor") {
      data.declaredAt = null;
      data.paidAt = null;
    }
  }

  const baseMinor = intOrUndef(body.baseMinor);
  if (baseMinor !== undefined) data.baseMinor = baseMinor;
  const taxMinor = intOrUndef(body.taxMinor);
  if (taxMinor !== undefined) data.taxMinor = taxMinor;
  const stampDutyMinor = intOrUndef(body.stampDutyMinor);
  if (stampDutyMinor !== undefined) data.stampDutyMinor = stampDutyMinor;
  const paidMinor = intOrUndef(body.paidMinor);
  if (paidMinor !== undefined) data.paidMinor = paidMinor;

  if (body.dueDate !== undefined) {
    const d = new Date(body.dueDate);
    if (!Number.isNaN(d.getTime())) data.dueDate = d;
  }
  if (body.notes !== undefined) data.notes = body.notes?.toString().trim() || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const updated = await prisma.taxObligation.update({ where: { id }, data });
  return NextResponse.json({ obligation: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  await prisma.taxObligation.deleteMany({ where: { id, siteId: auth.siteId } });
  return NextResponse.json({ ok: true });
}
