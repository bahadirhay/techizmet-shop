import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import { redirect } from "next/navigation";
import { CardCheckout } from "@/components/cart/CardCheckout";
import { CheckoutEmbedStyles } from "@/components/store/CheckoutEmbedStyles";
import { getStoreHomepageMode } from "@/lib/site-settings";
import {
  isThemeShellEnabledForCommercePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

export default async function CheckoutPayPage({
  searchParams,
}: {
  searchParams: Promise<ThemeShellPilotQuery & { order?: string; failed?: string; token?: string }>;
}) {
  const { order, failed, token, ...query } = await searchParams;
  if (!order?.trim() || !token?.trim()) redirect("/checkout");

  const homepageMode = await getStoreHomepageMode();
  const themeShellLive = readThemeShellPilotLive();
  const useThemeShell =
    homepageMode === "mirror" &&
    isThemeShellEnabledForCommercePath("/checkout/pay", query, themeShellLive);

  const pay = (
    <CardCheckout
      orderNumber={order.trim()}
      paymentToken={token.trim()}
      failed={failed === "1"}
    />
  );

  if (homepageMode === "mirror") {
    return (
      <div className={`kn-checkout-embed-root kn-paytr-page${useThemeShell ? " kn-theme-shell-checkout" : ""}`}>
        <CheckoutEmbedStyles />
        {pay}
      </div>
    );
  }

  return pay;
}
