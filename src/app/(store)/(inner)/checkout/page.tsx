import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { MirrorCheckoutFrame } from "@/components/store/MirrorCheckoutFrame";
import { getCheckoutPrefill } from "@/lib/checkout/prefill";
import { getCheckoutPaymentContext } from "@/lib/checkout/payment-context";
import { getCustomerSession } from "@/lib/customer-session";
import { getStoreHomepageMode, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { resolveLegalSellerProfile } from "@/lib/legal/seller-profile";

export default async function CheckoutPage() {
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);

  if (homepageMode === "mirror") {
    return <MirrorCheckoutFrame />;
  }

  const settings = await getSiteSettings(site.id);
  const session = await getCustomerSession();
  const prefill = await getCheckoutPrefill(site.id);
  const payment = await getCheckoutPaymentContext(
    settings,
    site.id,
    session.isLoggedIn ? session.customerId : null,
  );
  const sellerProfile = resolveLegalSellerProfile(settings, site);

  return (
    <div className="kn-checkout-page-wrap">
      <CheckoutForm prefill={prefill} payment={payment} sellerProfile={sellerProfile} />
    </div>
  );
}
