import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import { notFound } from "next/navigation";
import { CartPageClient } from "@/components/cart/CartPageClient";
import { MirrorCartFrame } from "@/components/store/MirrorCartFrame";
import { ThemeShellCommerceView } from "@/components/store/ThemeShellCommerceView";
import { getStoreLocale } from "@/lib/i18n/server";
import { buildCartPageBridgeScript } from "@/lib/mirror-cart-page";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { resolveThemeShellCartContent } from "@/lib/theme-shell-commerce-content";
import {
  isThemeShellEnabledForCommercePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<ThemeShellPilotQuery>;
}) {
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  const query = await searchParams;
  const themeShellLive = readThemeShellPilotLive();
  const useThemeShell =
    homepageMode === "mirror" &&
    isThemeShellEnabledForCommercePath("/cart", query, themeShellLive);

  if (useThemeShell) {
    const locale = await getStoreLocale();
    const content = await resolveThemeShellCartContent(locale);
    if (!content) notFound();
    return (
      <ThemeShellCommerceView
        content={content}
        bridgeScripts={[buildCartPageBridgeScript(locale)]}
      />
    );
  }

  if (homepageMode === "mirror") {
    return <MirrorCartFrame />;
  }

  return (
    <div className="kn-section">
      <CartPageClient />
    </div>
  );
}
