import { CartProvider } from "@/components/cart/CartContext";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { CheckoutEmbedStyles } from "@/components/store/CheckoutEmbedStyles";
import { getCartCustomerId } from "@/lib/cart/customer-id";
import { buildCartView, getShippingOptions } from "@/lib/cart/service";
import { getCartSession } from "@/lib/cart/session";
import { getCheckoutPrefill } from "@/lib/checkout/prefill";
import { getCheckoutPaymentContext } from "@/lib/checkout/payment-context";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { getStoreLocale } from "@/lib/i18n/server";
import { getEffectiveUsdTryRate } from "@/lib/currency/exchange-rate";
import { resolveLegalSellerProfile } from "@/lib/legal/seller-profile";

/** Mirror iframe — sunucuda sepet + form (boş sayfa flaşı yok) */
export default async function CheckoutEmbedPage() {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const session = await getCartSession();
  const customerId = await getCartCustomerId();
  const initialCart = await buildCartView(
    { items: session.items, couponCode: session.couponCode },
    site.id,
    customerId,
  );
  const prefill = await getCheckoutPrefill(site.id);
  const payment = await getCheckoutPaymentContext(settings, site.id, customerId);
  const locale = await getStoreLocale();
  const sellerProfile = resolveLegalSellerProfile(settings, site);
  const usdRate =
    locale === "en"
      ? await getEffectiveUsdTryRate(settings.store?.usdMarkupPercent ?? 0)
      : null;

  // Kargo seçeneklerini sunucuda hesapla — client-side fetch gecikmesini engeller
  let initialShipping: Awaited<ReturnType<typeof getShippingOptions>> = [];
  if (initialCart.items.length > 0 && !initialCart.freeShipping) {
    const products = await prisma.storeProduct.findMany({
      where: { id: { in: initialCart.items.map((i) => i.productId) } },
      select: { desi: true },
    });
    const totalDesi = Math.max(1, products.reduce((s, p) => s + (p.desi ?? 1), 0));
    initialShipping = await getShippingOptions(
      site.id,
      initialCart.subtotalMinor - initialCart.discountMinor,
      false,
      totalDesi,
    );
  }

  return (
    <div className="kn-checkout-embed-root">
      <CheckoutEmbedStyles />
      <CartProvider initialCart={initialCart}>
        <CheckoutForm
          embed
          prefill={prefill}
          payment={payment}
          initialShipping={initialShipping}
          initialFreeShipping={initialCart.freeShipping}
          locale={locale}
          usdRate={usdRate}
          sellerProfile={sellerProfile}
        />
      </CartProvider>
    </div>
  );
}
