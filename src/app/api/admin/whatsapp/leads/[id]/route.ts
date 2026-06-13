import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";
import { normalizeWaLeadStatus } from "@/lib/whatsapp-lead";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json()) as { status?: string; notes?: string | null };

  const prev = await prisma.whatsAppLead.findFirst({ where: { id, siteId: auth.siteId } });
  if (!prev) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const status = body.status !== undefined ? normalizeWaLeadStatus(body.status) : undefined;
  if (body.status !== undefined && !status) {
    return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
  }

  const notes =
    body.notes !== undefined
      ? body.notes === null
        ? null
        : body.notes.trim().slice(0, 4000) || null
      : undefined;

  const contactedAt =
    status === "contacted" && prev.status !== "contacted" ? new Date() : undefined;

  const data: { status?: string; notes?: string | null; contactedAt?: Date } = {};
  if (status) data.status = status;
  if (notes !== undefined) data.notes = notes;
  if (contactedAt) data.contactedAt = contactedAt;

  const row = await prisma.whatsAppLead.update({ where: { id }, data });
  return NextResponse.json(row);
}
