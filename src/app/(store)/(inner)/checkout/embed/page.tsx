import { CartProvider } from "@/components/cart/CartContext";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { CheckoutEmbedStyles } from "@/components/store/CheckoutEmbedStyles";
import { getCheckoutPrefill } from "@/lib/checkout/prefill";
import { getCheckoutPaymentFlags } from "@/lib/checkout/payment-options";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

/** Eski mirror iframe yolu — yalnızca hafif CSS + form */
export default async function CheckoutEmbedPage() {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const prefill = await getCheckoutPrefill(site.id);
  const payment = getCheckoutPaymentFlags(settings);

  return (
    <div className="kn-checkout-embed-root">
      <CheckoutEmbedStyles />
      <CartProvider>
        <CheckoutForm embed prefill={prefill} payment={payment} />
      </CartProvider>
    </div>
  );
}
