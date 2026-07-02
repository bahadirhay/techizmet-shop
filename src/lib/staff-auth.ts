import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import {
  allStaffPermissions,
  parsePermissionsJson,
} from "@/lib/staff-permissions";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { ensureStoreTenant } from "@/lib/store-tenant";

export type StaffAccess = {
  staffUserId: string;
  username: string;
  roleSlug: string;
  siteId: string;
  permissions: string[];
};

function isAdminRole(roleSlug: string): boolean {
  return roleSlug.split(",").some((s) => s.trim() === "admin");
}

/** Veritabanından gelen izinleri birleştirir; admin rolü her zaman tam yetki */
export function resolveStaffPermissions(roleSlug: string, fromDb: string[]): string[] {
  if (isAdminRole(roleSlug)) return allStaffPermissions();
  return fromDb;
}

export async function loadStaffSession(userId: string, siteId: string) {
  const user = await prisma.shopStaffUser.findFirst({
    where: { id: userId, siteId, active: true },
    include: { roleAssignments: { include: { role: true } } },
  });
  if (!user) return null;
  const roles = user.roleAssignments.map((a) => a.role);
  const slug = roles.map((r) => r.slug).join(",");
  const perms = new Set<string>();
  for (const r of roles) {
    for (const p of parsePermissionsJson(r.permissionsJson)) perms.add(p);
  }
  const fromDb = [...perms];
  return {
    staffUserId: user.id,
    username: user.username,
    roleSlug: slug || "admin",
    siteId,
    permissions: resolveStaffPermissions(slug || "admin", fromDb),
  };
}

/** Sayfa/API isteklerinde yetkiler DB'den okunur (çerez RSC'de yazılamaz). */
async function staffAccessFromSession(session: {
  staffUserId?: string;
  siteId?: string;
}): Promise<StaffAccess | null> {
  if (!session.staffUserId || !session.siteId) return null;
  return loadStaffSession(session.staffUserId, session.siteId);
}

/** Aynı RSC isteğinde layout + sayfa tek oturum/DB sorgusu */
const loadStaffAccessCached = cache(async (): Promise<StaffAccess | null> => {
  const s = await getAdminSession();
  if (!s.isLoggedIn || !s.staffUserId || !s.siteId) return null;

  const site = await getDefaultSite();
  if (s.siteId !== site.id) return null;

  return staffAccessFromSession(s);
});

export async function requireStaffPage(): Promise<StaffAccess> {
  // Tenant'ı bu çağıranın (layout/page) async context'ine yaz — RSC page
  // render'ında prisma'nın doğru tenant DB'sini kullanmasını garanti eder.
  await ensureStoreTenant();
  const s = await getAdminSession();
  const loaded = await loadStaffAccessCached();
  if (!loaded) {
    if (s.isLoggedIn) {
      s.destroy();
    }
    redirect("/admin/login");
  }
  return loaded;
}

export async function requireStaffApi(perm?: string): Promise<StaffAccess | NextResponse> {
  await ensureStoreTenant();
  const s = await getAdminSession();
  const loaded = await loadStaffAccessCached();
  if (!loaded) {
    if (s.isLoggedIn) {
      await s.destroy();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (perm && !loaded.permissions.includes(perm)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return loaded;
}
