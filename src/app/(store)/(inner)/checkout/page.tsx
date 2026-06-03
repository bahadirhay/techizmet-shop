import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { getCheckoutPrefill } from "@/lib/checkout/prefill";
import { getCheckoutPaymentFlags } from "@/lib/checkout/payment-options";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

/** Ödeme — doğrudan form (çift mirror iframe yok, daha hızlı) */
export default async function CheckoutPage() {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const prefill = await getCheckoutPrefill(site.id);
  const payment = getCheckoutPaymentFlags(settings);

  return (
    <div className="kn-checkout-page-wrap">
      <CheckoutForm prefill={prefill} payment={payment} />
    </div>
  );
}
