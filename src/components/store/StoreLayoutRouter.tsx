"use client";

import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { CartProvider } from "@/components/cart/CartContext";
import { HtmlLang } from "@/components/store/HtmlLang";
import { MirrorIframeBootScript } from "@/components/store/MirrorIframeBootScript";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreShell } from "@/components/store/StoreShell";
import { ThemeShellAnnouncementBar } from "@/components/store/ThemeShellAnnouncementBar";
import { ThemeShellHeaderBoot } from "@/components/store/ThemeShellHeaderBoot";
import { ThemeShellMarqueeBoot } from "@/components/store/ThemeShellMarqueeBoot";
import { ThemeShellScrollTop } from "@/components/store/ThemeShellScrollTop";
import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { StoreMessages } from "@/lib/i18n/messages";
import type { HomepageMode } from "@/lib/site-settings";
import type { SocialLink } from "@/lib/social-links";
import type { ThemeShellDrawers } from "@/lib/theme-shell-drawers";
import { isMirrorShellPath } from "@/lib/store-mirror-paths";
import {
  isThemeShellEnabledForPath,
  isThemeShellMinimalChromePath,
} from "@/lib/theme-shell-pilot";

const StoreThemeStyles = dynamic(
  () => import("@/components/store/StoreThemeStyles").then((m) => ({ default: m.StoreThemeStyles })),
  { ssr: true },
);

function ThemeStylesForPath({ pathname }: { pathname: string }) {
  return <StoreThemeStyles pathname={pathname} />;
}

/** Mirror / React shell ayrımı — client pathname ile (blog → vitrin geçişinde çift header önlenir) */
export function StoreLayoutRouter({
  homepageMode,
  locale,
  siteName,
  logoSrc,
  messages,
  nav,
  socialLinks,
  themeShellPilotLive = false,
  announcementSlides,
  announcementScheme,
  footerHtml,
  schemeCss,
  themeColorsCss,
  mirrorDrawers,
  children,
}: {
  homepageMode: HomepageMode;
  locale: ShopLocale;
  siteName: string;
  logoSrc?: string;
  messages: StoreMessages;
  nav: ResolvedNavItem[];
  socialLinks?: SocialLink[];
  themeShellPilotLive?: boolean;
  announcementSlides?: string[];
  announcementScheme?: string;
  footerHtml?: string;
  schemeCss?: string;
  themeColorsCss?: string;
  mirrorDrawers?: ThemeShellDrawers | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const query = {
    themeShell: searchParams.get("themeShell"),
    mirror: searchParams.get("mirror"),
  };
  const themeShellActive = isThemeShellEnabledForPath(pathname, query, themeShellPilotLive);
  const minimalChrome =
    homepageMode === "mirror" &&
    isThemeShellMinimalChromePath(pathname) &&
    (themeShellPilotLive || query.themeShell === "1") &&
    query.mirror !== "1";
  const mirrorShell =
    homepageMode === "mirror" && isMirrorShellPath(pathname, { themeShellActive });

  if (mirrorShell || minimalChrome) {
    return (
      <>
        <HtmlLang locale={locale} />
        <MirrorIframeBootScript />
        <CartProvider>{children}</CartProvider>
      </>
    );
  }

  if (themeShellActive) {
    return (
      <>
        <HtmlLang locale={locale} />
        <StoreThemeStyles />
        {schemeCss ? <style dangerouslySetInnerHTML={{ __html: schemeCss }} /> : null}
        {themeColorsCss ? <style dangerouslySetInnerHTML={{ __html: themeColorsCss }} /> : null}
        {announcementSlides?.length ? (
          <ThemeShellAnnouncementBar slides={announcementSlides} schemeClass={announcementScheme} />
        ) : null}
        <ThemeShellHeaderBoot />
        <ThemeShellMarqueeBoot />
        <StoreShell
          siteName={siteName}
          logoSrc={logoSrc}
          locale={locale}
          messages={messages}
          nav={nav}
          mirrorDrawers={themeShellActive ? (mirrorDrawers ?? undefined) : undefined}
        >
          <main className="kn-main">{children}</main>
          {footerHtml ? (
            <div dangerouslySetInnerHTML={{ __html: footerHtml }} />
          ) : (
            <StoreFooter siteName={siteName} messages={messages.footer} socialLinks={socialLinks} />
          )}
        </StoreShell>
        <ThemeShellScrollTop />
      </>
    );
  }

  return (
    <>
      <HtmlLang locale={locale} />
      <ThemeStylesForPath pathname={pathname} />
      {themeColorsCss ? <style dangerouslySetInnerHTML={{ __html: themeColorsCss }} /> : null}
      <StoreShell siteName={siteName} logoSrc={logoSrc} locale={locale} messages={messages} nav={nav}>
        <main className="kn-main">{children}</main>
        <StoreFooter siteName={siteName} messages={messages.footer} socialLinks={socialLinks} />
      </StoreShell>
    </>
  );
}
