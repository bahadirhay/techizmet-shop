import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { validateNewPassword } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request) {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { currentPassword?: string; newPassword?: string };
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  const err = validateNewPassword(newPassword);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "Yeni şifre mevcut şifreden farklı olmalı" }, { status: 400 });
  }

  const user = await prisma.shopStaffUser.findFirst({
    where: { id: auth.staffUserId, siteId: auth.siteId, active: true },
  });
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Mevcut şifre hatalı" }, { status: 401 });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.shopStaffUser.update({ where: { id: user.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
