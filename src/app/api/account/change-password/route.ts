import { NextResponse } from "next/server";
import { requireCustomerApi } from "@/lib/account/require-customer";
import { hashCustomerPassword, verifyCustomerPassword } from "@/lib/customer-auth";
import { validateNewPassword } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireCustomerApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { currentPassword?: string; newPassword?: string };
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  const err = validateNewPassword(newPassword);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const customer = auth.customer;
  if (!customer.passwordHash) {
    return NextResponse.json({ error: "Hesabınızda şifre tanımlı değil" }, { status: 400 });
  }

  const ok = await verifyCustomerPassword(currentPassword, customer.passwordHash);
  if (!ok) return NextResponse.json({ error: "Mevcut şifre hatalı" }, { status: 401 });

  const passwordHash = await hashCustomerPassword(newPassword);
  await prisma.storeCustomer.update({
    where: { id: customer.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
