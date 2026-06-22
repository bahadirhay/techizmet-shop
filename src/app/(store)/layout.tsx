import { StoreLayoutRouter } from "@/components/store/StoreLayoutRouter";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getStoreMessages } from "@/lib/i18n/messages";
import { getStoreLocale } from "@/lib/i18n/server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const messages = getStoreMessages(locale);
  const settings = await getCachedParsedSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);

  return (
    <StoreLayoutRouter
      homepageMode={getHomepageMode(settings)}
      locale={locale}
      siteName={site.name}
      logoSrc={branding.logoUrl}
      messages={messages}
      nav={nav}
    >
      {children}
    </StoreLayoutRouter>
  );
}
