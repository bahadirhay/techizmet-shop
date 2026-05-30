import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { MirrorCheckoutFrame } from "@/components/store/MirrorCheckoutFrame";
import { getCheckoutPrefill } from "@/lib/checkout/prefill";
import { getSiteSettings, isCardPaymentEnabled, getStoreHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

export default async function CheckoutPage() {
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  if (homepageMode === "mirror") {
    return <MirrorCheckoutFrame />;
  }

  const settings = await getSiteSettings(site.id);
  const prefill = await getCheckoutPrefill(site.id);
  return (
    <div className="kn-checkout-page-wrap">
      <CheckoutForm
        prefill={prefill}
        payment={{
          codEnabled: settings.payment?.codEnabled ?? true,
          bankTransferEnabled: settings.payment?.bankTransferEnabled ?? true,
          cardEnabled: isCardPaymentEnabled(settings),
          bankAccounts: settings.payment?.bankAccounts ?? [],
        }}
      />
    </div>
  );
}
