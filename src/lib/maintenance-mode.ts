import type { SiteSettings } from "@/lib/site-settings";

export type SiteMaintenanceSettings = {
  enabled?: boolean;
  title?: string | null;
  message?: string | null;
};

export type ResolvedMaintenance = {
  enabled: boolean;
  title: string;
  message: string;
};

export const DEFAULT_MAINTENANCE_TITLE_TR = "Kısa süre sonra buradayız";
export const DEFAULT_MAINTENANCE_MESSAGE_TR =
  "Sitemizde kısa süreli bakım çalışması yapıyoruz. Lütfen biraz sonra tekrar ziyaret edin.";

export const ADMIN_SESSION_COOKIE = "techizmet_shop_admin";

/** Proxy / bakım sayfası — bu yollar engellenmez */
export function isMaintenanceBypassPath(pathname: string): boolean {
  if (
    pathname === "/bakim" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/site/maintenance") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_mirror-prebuilt") ||
    pathname.startsWith("/theme/")
  ) {
    return true;
  }
  return false;
}

export function parseMaintenanceSettings(settings: SiteSettings | null | undefined): ResolvedMaintenance {
  const m = settings?.maintenance;
  return {
    enabled: m?.enabled === true,
    title: m?.title?.trim() || DEFAULT_MAINTENANCE_TITLE_TR,
    message: m?.message?.trim() || DEFAULT_MAINTENANCE_MESSAGE_TR,
  };
}
