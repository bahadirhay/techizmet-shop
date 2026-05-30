import { StoreNavigationForm } from "@/components/admin/StoreNavigationForm";
import { parseSiteSettings } from "@/lib/site-settings";
import { DEFAULT_STORE_FOOTER } from "@/lib/store-footer";
import { DEFAULT_STORE_NAV } from "@/lib/store-navigation";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function StoreNavigationAdminPage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  if (!settings.theme?.navItems?.length) {
    settings.theme = { ...settings.theme, navItems: DEFAULT_STORE_NAV };
  }
  if (!settings.theme?.footer?.columns?.length) {
    settings.theme = { ...settings.theme, footer: DEFAULT_STORE_FOOTER };
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Footer & çerez</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Üst menü ve mega menü için{" "}
          <a href="/admin/settings/menu" className="underline">
            Ayarlar → Menü & kategoriler
          </a>
          .
        </p>
      </div>
      <StoreNavigationForm initial={settings} />
    </div>
  );
}
