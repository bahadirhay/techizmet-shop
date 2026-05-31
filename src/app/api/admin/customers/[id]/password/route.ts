import { NextResponse } from "next/server";
import { hashCustomerPassword } from "@/lib/customer-auth";
import { validateNewPassword } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("store.customers");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = (await req.json()) as { newPassword?: string };
  const newPassword = body.newPassword ?? "";

  const err = validateNewPassword(newPassword);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const customer = await prisma.storeCustomer.findFirst({
    where: { id, siteId: auth.siteId },
    select: { id: true, email: true },
  });
  if (!customer) return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
  if (!customer.email?.trim()) {
    return NextResponse.json({ error: "Müşterinin kayıtlı e-postası yok" }, { status: 400 });
  }

  const passwordHash = await hashCustomerPassword(newPassword);
  await prisma.storeCustomer.update({
    where: { id: customer.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true, email: customer.email });
}
