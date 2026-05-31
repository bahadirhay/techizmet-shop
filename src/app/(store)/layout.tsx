import { headers } from "next/headers";
import { CartProvider } from "@/components/cart/CartContext";
import { HtmlLang } from "@/components/store/HtmlLang";
import { StoreThemeStyles } from "@/components/store/StoreThemeStyles";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreShell } from "@/components/store/StoreShell";
import { getStoreMessages } from "@/lib/i18n/messages";
import { getStoreLocale } from "@/lib/i18n/server";
import { getSiteBranding, getSiteSettings, getStoreHomepageMode } from "@/lib/site-settings";
import { isMirrorShellPath } from "@/lib/store-mirror-paths";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getDefaultSite } from "@/lib/site";

export const revalidate = 300;

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const messages = getStoreMessages(locale);
  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const homepageMode = await getStoreHomepageMode(site.id);
  const nav = await loadMirrorNavItems(site.id, locale);

  const h = await headers();
  const pathname = h.get("x-pathname") ?? "/";
  const mirrorShell = homepageMode === "mirror" && isMirrorShellPath(pathname);

  if (mirrorShell) {
    return (
      <>
        <HtmlLang locale={locale} />
        <CartProvider>{children}</CartProvider>
      </>
    );
  }

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
