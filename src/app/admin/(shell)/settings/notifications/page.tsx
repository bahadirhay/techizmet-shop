import { NotificationSettingsForm } from "@/components/admin/NotificationSettingsForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function NotificationSettingsPage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);

  return (
    <div>
      <AdminPageHeader
        title="Bildirim ayarları"
        description="E-posta sunucusu (SMTP), bildirim tercihleri, SMS ve Telegram — mağaza başına veritabanında. .env değerleri panel boşken yedek olarak kullanılır."
      />
      <NotificationSettingsForm initial={settings} />
    </div>
  );
}
