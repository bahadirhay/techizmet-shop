import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function StoreSettingsPage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Mağaza ayarları</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Sipariş numarası, kargo etiketi gönderici adresi, ücretsiz kargo eşiği, üst duyuru şeridi ve vitrin metinleri.
      </p>
      <div className="mt-6">
        <StoreSettingsForm initial={settings} />
      </div>
    </div>
  );
}
