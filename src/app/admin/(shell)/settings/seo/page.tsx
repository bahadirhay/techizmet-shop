import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StoreSeoSettingsForm } from "@/components/admin/StoreSeoSettingsForm";
import { getSiteBranding, getSiteSeo, parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function SeoSettingsPage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const branding = getSiteBranding(settings);
  const seo = getSiteSeo(settings, site?.name ?? "Mağaza");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:5555";

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Ayarlar & Sistem", href: "/admin/theme" },
          { label: "Logo, favicon & SEO" },
        ]}
        title="Logo, favicon & SEO"
        description="Vitrinde görünen logo ve SEO değerleri buradan yönetilir. Alanlar vitrindeki güncel görünümle doldurulur."
      />
      <StoreSeoSettingsForm
        initial={{ branding, seo }}
        siteUrl={siteUrl}
        siteName={site?.name ?? "Mağaza"}
      />
    </div>
  );
}
