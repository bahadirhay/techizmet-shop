import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GoogleMerchantSettingsForm } from "@/components/admin/GoogleMerchantSettingsForm";
import { ADMIN_SEO_BREADCRUMB } from "@/lib/admin/nav";
import { googleMerchantFeedUrl } from "@/lib/seo/google-merchant-feed";
import { parseGoogleMerchantSettings } from "@/lib/seo/google-merchant-types";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function GoogleMerchantSettingsPage() {
  const auth = await requireStaffPage();
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const config = parseGoogleMerchantSettings(settings.googleMerchant, site?.name ?? "Mağaza");

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[ADMIN_SEO_BREADCRUMB, { label: "Google Merchant" }]}
        title="Google Merchant Center"
        description="Ürün feed XML — Google Alışveriş ve ücretsiz listelemeler için."
      />
      <GoogleMerchantSettingsForm
        siteName={site?.name ?? "Mağaza"}
        initial={{
          enabled: config.enabled,
          googleProductCategory: config.googleProductCategory,
          currency: config.currency,
          defaultBrand: config.defaultBrand,
          condition: config.condition,
          shippingCountry: config.shippingCountry,
          shippingPriceMinor: config.shippingPriceMinor,
          feedToken: "",
          hasFeedToken: Boolean(settings.googleMerchant?.feedToken?.trim()),
          feedUrl: googleMerchantFeedUrl(config.feedToken || undefined),
          feedUrlPublic: googleMerchantFeedUrl(),
        }}
      />
    </div>
  );
}
