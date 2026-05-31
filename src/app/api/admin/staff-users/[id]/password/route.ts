import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { validateNewPassword } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("users.manage");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = (await req.json()) as { newPassword?: string };
  const newPassword = body.newPassword ?? "";

  const err = validateNewPassword(newPassword);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const user = await prisma.shopStaffUser.findFirst({
    where: { id, siteId: auth.siteId, active: true },
  });
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.shopStaffUser.update({ where: { id: user.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true, username: user.username });
}
