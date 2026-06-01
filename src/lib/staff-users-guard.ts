import type { PrismaClient } from "@prisma/client";

export async function countActiveAdmins(
  prisma: PrismaClient,
  siteId: string,
  excludeUserId?: string,
): Promise<number> {
  const adminRole = await prisma.shopStaffRole.findFirst({
    where: { siteId, slug: "admin" },
    select: { id: true },
  });
  if (!adminRole) return 0;
  return prisma.shopStaffUser.count({
    where: {
      siteId,
      active: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      roleAssignments: { some: { roleId: adminRole.id } },
    },
  });
}

export function normalizeStaffUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Mağaza üyesi e-postasından panel giriş kullanıcı adı önerisi */
export function suggestStaffUsernameFromEmail(email: string): string {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  const cleaned = local.replace(/[^a-z0-9._-]/g, "").slice(0, 32);
  return cleaned.length >= 3 ? cleaned : `user${Date.now().toString(36).slice(-6)}`;
}

export function validateStaffUsername(username: string): string | null {
  if (username.length < 3) return "Kullanıcı adı en az 3 karakter olmalı";
  if (username.length > 32) return "Kullanıcı adı en fazla 32 karakter olabilir";
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return "Yalnızca küçük harf, rakam, nokta, tire ve alt çizgi kullanın";
  }
  return null;
}
