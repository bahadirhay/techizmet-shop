import { Suspense } from "react";
import { StoreLayoutRouter } from "@/components/store/StoreLayoutRouter";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getStoreMessages } from "@/lib/i18n/messages";
import { getStoreLocale } from "@/lib/i18n/server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { detectSocialLinks } from "@/lib/social-links";
import { resolveThemeShellChrome } from "@/lib/theme-shell-chrome";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const messages = getStoreMessages(locale);
  const settings = await getCachedParsedSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);
  const socialLinks = detectSocialLinks(settings.seo?.organizationSameAs);

  const lightLogoRaw = settings.branding?.logoUrlLight?.trim();
  const footerLogoLight =
    lightLogoRaw && lightLogoRaw !== settings.branding?.logoUrl?.trim() ? lightLogoRaw : null;
  const chrome = await resolveThemeShellChrome(site.id, locale, footerLogoLight);

  return (
    <Suspense fallback={null}>
      <StoreLayoutRouter
        homepageMode={getHomepageMode(settings)}
        locale={locale}
        siteName={site.name}
        logoSrc={branding.logoUrl}
        messages={messages}
        nav={nav}
        socialLinks={socialLinks}
        themeShellPilotLive={process.env.THEME_SHELL_PILOT_LIVE === "1"}
        announcementSlides={chrome.announcementSlides}
        announcementScheme={chrome.announcementScheme}
        footerHtml={chrome.footerHtml}
        schemeCss={chrome.schemeCss}
      >
        {children}
      </StoreLayoutRouter>
    </Suspense>
  );
}
