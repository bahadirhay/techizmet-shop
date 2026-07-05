import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { MirrorCheckoutFrame } from "@/components/store/MirrorCheckoutFrame";
import { ThemeShellCheckoutForm } from "@/components/store/ThemeShellCheckoutForm";
import { loadCheckoutEmbedPayload } from "@/lib/checkout/embed-payload";
import { getCheckoutPrefill } from "@/lib/checkout/prefill";
import { getCheckoutPaymentContext } from "@/lib/checkout/payment-context";
import { getCustomerSession } from "@/lib/customer-session";
import { getStoreLocale } from "@/lib/i18n/server";
import { getStoreHomepageMode, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { resolveLegalSellerProfile } from "@/lib/legal/seller-profile";
import {
  isThemeShellEnabledForCommercePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<ThemeShellPilotQuery>;
}) {
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  const query = await searchParams;
  const themeShellLive = process.env.THEME_SHELL_PILOT_LIVE === "1";
  const useThemeShell =
    homepageMode === "mirror" &&
    isThemeShellEnabledForCommercePath("/checkout", query, themeShellLive);

  if (useThemeShell) {
    const locale = await getStoreLocale();
    const payload = await loadCheckoutEmbedPayload(site, locale);
    return <ThemeShellCheckoutForm payload={payload} />;
  }

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
