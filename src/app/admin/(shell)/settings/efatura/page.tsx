import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EfaturaSettingsForm } from "@/components/admin/EfaturaSettingsForm";
import { parseEfaturaSettings } from "@/lib/efatura/settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function EfaturaSettingsPage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const config = parseEfaturaSettings(settings.efatura);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Ayarlar", href: "/admin/settings/seo" },
          { label: "e-Fatura" },
        ]}
        title="GİB e-Arşiv fatura"
        description="Web sitesi ve pazaryeri siparişleri için ücretsiz e-Arşiv faturası."
      />
      <EfaturaSettingsForm
        initial={{
          enabled: config.enabled,
          testMode: config.testMode,
          sellerTitle: config.sellerTitle,
          sellerTaxId: config.sellerTaxId,
          sellerTaxOffice: config.sellerTaxOffice,
          username: settings.efatura?.username ?? "",
          password: "",
          defaultConsumerTaxId: config.defaultConsumerTaxId,
          defaultVatRate: config.defaultVatRate,
          autoSign: config.autoSign,
          autoSendMarketplace: config.autoSendMarketplace,
          hasPassword: Boolean(process.env.GIB_PASSWORD || settings.efatura?.password),
        }}
      />
    </div>
  );
}
