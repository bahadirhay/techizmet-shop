import type { PrismaClient } from "@prisma/client";
import { allStaffPermissions, type StaffPermission } from "@/lib/staff-permissions";

export type StaffRolePreset = {
  slug: string;
  label: string;
  permissions: StaffPermission[];
};

export const STAFF_ROLE_PRESETS: StaffRolePreset[] = [
  { slug: "admin", label: "Yönetici", permissions: allStaffPermissions() },
  {
    slug: "editor",
    label: "Editör",
    permissions: ["content.pages", "site.theme", "store.dashboard"],
  },
  { slug: "pages", label: "Sayfa editörü", permissions: ["content.pages"] },
  {
    slug: "catalog",
    label: "Ürün yöneticisi",
    permissions: ["store.products", "store.collections", "store.dashboard"],
  },
  { slug: "accountant", label: "Muhasebe", permissions: ["store.finance", "store.dashboard"] },
  {
    slug: "marketplace",
    label: "Pazaryeri",
    permissions: ["store.integrations", "store.orders", "store.dashboard"],
  },
];

/** Mağaza için varsayılan panel rollerini oluşturur / günceller (idempotent). */
export async function ensureDefaultStaffRoles(prisma: PrismaClient, siteId: string) {
  for (const preset of STAFF_ROLE_PRESETS) {
    const permissionsJson = JSON.stringify(preset.permissions);
    await prisma.shopStaffRole.upsert({
      where: { siteId_slug: { siteId, slug: preset.slug } },
      create: { siteId, slug: preset.slug, label: preset.label, permissionsJson },
      update: { label: preset.label, permissionsJson },
    });
  }
}

export function isAdminRoleSlug(slug: string): boolean {
  return slug === "admin";
}
