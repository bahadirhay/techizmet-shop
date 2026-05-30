import { EmailTemplatesForm } from "@/components/admin/EmailTemplatesForm";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function EmailTemplatesPage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);

  return (
    <div>
      <h1 className="text-2xl font-semibold">E-posta şablonları</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Sol menü → Bağlantılar. Sipariş onayı, kargo ve iptal — durum değişince otomatik gönderilir.
      </p>
      <div className="mt-6">
        <EmailTemplatesForm initial={settings} />
      </div>
    </div>
  );
}
