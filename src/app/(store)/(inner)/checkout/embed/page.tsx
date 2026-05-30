import { CartProvider } from "@/components/cart/CartContext";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { StoreThemeStyles } from "@/components/store/StoreThemeStyles";
import { getCheckoutPrefill } from "@/lib/checkout/prefill";
import { getSiteSettings, isCardPaymentEnabled } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

export default async function CheckoutEmbedPage() {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const prefill = await getCheckoutPrefill(site.id);

  return (
    <div className="kn-checkout-embed-root">
      <StoreThemeStyles />
      <CartProvider>
        <CheckoutForm
          embed
          prefill={prefill}
          payment={{
            codEnabled: settings.payment?.codEnabled ?? true,
            bankTransferEnabled: settings.payment?.bankTransferEnabled ?? true,
            cardEnabled: isCardPaymentEnabled(settings),
            bankAccounts: settings.payment?.bankAccounts ?? [],
          }}
        />
      </CartProvider>
    </div>
  );
}
