import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { validateNewPassword } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";
import {
  normalizeStaffUsername,
  validateStaffUsername,
} from "@/lib/staff-users-guard";

export async function POST(req: Request) {
  const auth = await requireStaffApi("users.manage");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    username?: string;
    displayName?: string;
    password?: string;
    roleIds?: string[];
  };

  const username = normalizeStaffUsername(body.username ?? "");
  const usernameErr = validateStaffUsername(username);
  if (usernameErr) return NextResponse.json({ error: usernameErr }, { status: 400 });

  const password = body.password ?? "";
  const passErr = validateNewPassword(password);
  if (passErr) return NextResponse.json({ error: passErr }, { status: 400 });

  const roleIds = Array.isArray(body.roleIds) ? [...new Set(body.roleIds.filter(Boolean))] : [];
  if (roleIds.length === 0) {
    return NextResponse.json({ error: "En az bir rol seçin" }, { status: 400 });
  }

  const roles = await prisma.shopStaffRole.findMany({
    where: { siteId: auth.siteId, id: { in: roleIds } },
    select: { id: true },
  });
  if (roles.length !== roleIds.length) {
    return NextResponse.json({ error: "Geçersiz rol seçimi" }, { status: 400 });
  }

  const exists = await prisma.shopStaffUser.findUnique({
    where: { siteId_username: { siteId: auth.siteId, username } },
    select: { id: true },
  });
  if (exists) {
    return NextResponse.json({ error: "Bu kullanıcı adı zaten kullanılıyor" }, { status: 409 });
  }

  const displayName = body.displayName?.trim() || null;
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.shopStaffUser.create({
    data: {
      siteId: auth.siteId,
      username,
      displayName,
      passwordHash,
      active: true,
      roleAssignments: {
        create: roleIds.map((roleId) => ({ roleId })),
      },
    },
    select: { id: true, username: true },
  });

  return NextResponse.json({ ok: true, user });
}
