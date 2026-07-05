import { CartProvider } from "@/components/cart/CartContext";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { CheckoutEmbedStyles } from "@/components/store/CheckoutEmbedStyles";
import { loadCheckoutEmbedPayload } from "@/lib/checkout/embed-payload";
import { getDefaultSite } from "@/lib/site";
import { getStoreLocale } from "@/lib/i18n/server";

/** Mirror iframe hedefi — header/footer yok, yalnızca ödeme formu */
export default async function CheckoutEmbedPage() {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const payload = await loadCheckoutEmbedPayload(site, locale);

  return (
    <div className="kn-checkout-embed-root">
      <CheckoutEmbedStyles />
      <CartProvider initialCart={payload.initialCart}>
        <CheckoutForm
          embed
          prefill={payload.prefill}
          payment={payload.payment}
          initialShipping={payload.initialShipping}
          initialFreeShipping={payload.initialFreeShipping}
          locale={payload.locale}
          usdRate={payload.usdRate}
          sellerProfile={payload.sellerProfile}
          trAddress={payload.trAddress}
        />
      </CartProvider>
    </div>
  );
}
