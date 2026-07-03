import { Suspense } from "react";
import { StoreLayoutRouter } from "@/components/store/StoreLayoutRouter";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getStoreMessages } from "@/lib/i18n/messages";
import { getStoreLocale } from "@/lib/i18n/server";
import {
  buildAnnouncementSlideInnerHtml,
  getAnnouncementBarSettings,
} from "@/lib/mirror-announcement-bar";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { detectSocialLinks } from "@/lib/social-links";
import { buildThemeColorsOverrideCss } from "@/lib/theme-colors";
import { resolveThemeShellChrome } from "@/lib/theme-shell-chrome";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const messages = getStoreMessages(locale);
  const settings = await getCachedParsedSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);
  const socialLinks = detectSocialLinks(settings.seo?.organizationSameAs);

  const chrome = await resolveThemeShellChrome(site.id, locale, branding.logoUrlLight);

  // Duyuru şeridi — admin ayarından (yoksa mirror'dan çıkarılan slaytlara düş)
  const annBar = getAnnouncementBarSettings(settings, locale);
  const adminSlides =
    annBar.enabled === false
      ? []
      : (annBar.slides ?? [])
          .map(buildAnnouncementSlideInnerHtml)
          .filter((s) => s.length > 0);
  const announcementSlides =
    annBar.enabled === false
      ? []
      : adminSlides.length > 0
        ? adminSlides
        : chrome.announcementSlides;

  const themeColorsCss = buildThemeColorsOverrideCss(settings);

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
        announcementSlides={announcementSlides}
        announcementScheme={chrome.announcementScheme}
        footerHtml={chrome.footerHtml}
        schemeCss={chrome.schemeCss}
        themeColorsCss={themeColorsCss}
      >
        {children}
      </StoreLayoutRouter>
    </Suspense>
  );
}
