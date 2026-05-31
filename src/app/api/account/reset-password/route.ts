import { NextResponse } from "next/server";
import { hashCustomerPassword } from "@/lib/customer-auth";
import {
  consumeCustomerPasswordResetToken,
  markPasswordResetTokenUsed,
} from "@/lib/password-reset";
import { validateNewPassword } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

export async function POST(req: Request) {
  const body = (await req.json()) as { token?: string; newPassword?: string };
  const token = body.token?.trim() ?? "";
  const newPassword = body.newPassword ?? "";

  const err = validateNewPassword(newPassword);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  if (!token) return NextResponse.json({ error: "Geçersiz bağlantı" }, { status: 400 });

  const site = await getDefaultSite();
  const row = await consumeCustomerPasswordResetToken(site.id, token);
  if (!row) {
    return NextResponse.json({ error: "Bağlantı geçersiz veya süresi dolmuş" }, { status: 400 });
  }

  const passwordHash = await hashCustomerPassword(newPassword);
  await prisma.storeCustomer.update({
    where: { id: row.customerId },
    data: { passwordHash },
  });
  await markPasswordResetTokenUsed(row.id);

  return NextResponse.json({ ok: true });
}
