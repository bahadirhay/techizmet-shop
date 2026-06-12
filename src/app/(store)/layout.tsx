import { headers } from "next/headers";
import { CartProvider } from "@/components/cart/CartContext";
import { HtmlLang } from "@/components/store/HtmlLang";
import { StoreThemeStyles } from "@/components/store/StoreThemeStyles";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreShell } from "@/components/store/StoreShell";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getStoreMessages } from "@/lib/i18n/messages";
import { getStoreLocale } from "@/lib/i18n/server";
import { localeFromCookieValue } from "@/lib/i18n/locale";
import { getSiteBranding, getHomepageMode } from "@/lib/site-settings";
import { isMirrorShellPath } from "@/lib/store-mirror-paths";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getDefaultSite } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "/";

  if (isMirrorShellPath(pathname)) {
    const site = await getDefaultSite();
    const settings = await getCachedParsedSiteSettings(site.id);
    if (getHomepageMode(settings) === "mirror") {
      const locale = localeFromCookieValue(h.get("x-shop-locale") ?? undefined) ?? "tr";
      return (
        <>
          <HtmlLang locale={locale} />
          <CartProvider>{children}</CartProvider>
        </>
      );
    }
  }

  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const messages = getStoreMessages(locale);
  const settings = await getCachedParsedSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);

  return (
    <>
      <HtmlLang locale={locale} />
      <StoreThemeStyles />
      <StoreShell siteName={site.name} logoSrc={branding.logoUrl} locale={locale} messages={messages} nav={nav}>
        <main className="kn-main">{children}</main>
        <StoreFooter siteName={site.name} messages={messages.footer} />
      </StoreShell>
    </>
  );
}
