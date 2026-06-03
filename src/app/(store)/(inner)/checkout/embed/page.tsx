import { CartProvider } from "@/components/cart/CartContext";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { CheckoutEmbedStyles } from "@/components/store/CheckoutEmbedStyles";
import { getCartCustomerId } from "@/lib/cart/customer-id";
import { buildCartView } from "@/lib/cart/service";
import { getCartSession } from "@/lib/cart/session";
import { getCheckoutPrefill } from "@/lib/checkout/prefill";
import { getCheckoutPaymentFlags } from "@/lib/checkout/payment-options";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

/** Mirror iframe — sunucuda sepet + form (boş sayfa flaşı yok) */
export default async function CheckoutEmbedPage() {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const session = await getCartSession();
  const initialCart = await buildCartView(
    { items: session.items, couponCode: session.couponCode },
    site.id,
    await getCartCustomerId(),
  );
  const prefill = await getCheckoutPrefill(site.id);
  const payment = getCheckoutPaymentFlags(settings);

  return (
    <div className="kn-checkout-embed-root">
      <CheckoutEmbedStyles />
      <CartProvider initialCart={initialCart}>
        <CheckoutForm embed prefill={prefill} payment={payment} />
      </CartProvider>
    </div>
  );
}
