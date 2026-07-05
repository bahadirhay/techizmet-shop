import { CartProvider } from "@/components/cart/CartContext";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { CheckoutEmbedStyles } from "@/components/store/CheckoutEmbedStyles";
import type { CheckoutEmbedPayload } from "@/lib/checkout/embed-payload";

/** Tema kabuğu ödeme — mirror iframe yerine doğrudan React form */
export function ThemeShellCheckoutForm({ payload }: { payload: CheckoutEmbedPayload }) {
  return (
    <div className="kn-checkout-embed-root kn-theme-shell-checkout">
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
