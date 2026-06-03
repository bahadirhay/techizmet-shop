export const STAFF_PERMISSION_KEYS = [
  "store.dashboard",
  "store.products",
  "store.collections",
  "store.orders",
  "store.campaigns",
  "store.customers",
  "store.shipping",
  "store.integrations",
  "store.finance",
  "content.pages",
  "site.theme",
  "site.settings",
  "users.manage",
] as const;

export type StaffPermission = (typeof STAFF_PERMISSION_KEYS)[number];

/** Admin UI — izin matrisi etiketleri */
export const STAFF_PERMISSION_LABELS: Record<StaffPermission, string> = {
  "store.dashboard": "Özet Panel & Raporlar",
  "store.products": "Ürün Yönetimi & Fiyat",
  "store.collections": "Koleksiyonlar",
  "store.orders": "Siparişler & Kargo Etiketi",
  "store.campaigns": "Kampanyalar & Kupon",
  "store.customers": "Müşteriler & Üye Grupları",
  "store.shipping": "Kargo Firmaları",
  "store.integrations": "Pazaryeri, Ödeme, Bildirimler",
  "store.finance": "Ön Muhasebe",
  "content.pages": "Sayfalar, Blog, Vitrin İçeriği",
  "site.theme": "Tema, Menü, Footer",
  "site.settings": "Mağaza & SEO Ayarları",
  "users.manage": "Panel Kullanıcıları & Roller",
};

export function allStaffPermissions(): StaffPermission[] {
  return [...STAFF_PERMISSION_KEYS];
}

export function isValidStaffPermission(key: string): key is StaffPermission {
  return (STAFF_PERMISSION_KEYS as readonly string[]).includes(key);
}

export function parsePermissionsJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function hasStaffPermission(permissions: readonly string[], key: string): boolean {
  return permissions.includes(key);
}
