import { ThemeColorsForm } from "@/components/admin/ThemeColorsForm";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function ThemeColorsAdminPage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Renkler & Görünüm</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Header, footer ve marka renklerini buradan değiştirin. Üst duyuru şeridi metni için{" "}
          <a href="/admin/settings/store" className="underline">
            Mağaza Ayarları
          </a>
          .
        </p>
      </div>
      <ThemeColorsForm initial={settings} />
    </div>
  );
}
