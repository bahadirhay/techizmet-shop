import type { Metadata } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import { Poppins } from "next/font/google";
import { JsonLdScript } from "@/components/store/JsonLdScript";
import { LazyStoreWidgets } from "@/components/store/LazyStoreWidgets";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/seo/site-json-ld";
import { safeGoogleAnalyticsId } from "@/lib/seo/google-analytics-id";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getMirrorHomeHeroPreloadHref } from "@/lib/mirror-home-hero-preload";
import { resolveStoreMirrorIframeSrcForRequest } from "@/lib/mirror-prebuilt-resolve-server";
import { localeFromCookieValue } from "@/lib/i18n/locale";
import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import { getDefaultSite } from "@/lib/site";
import { getHomepageMode, getSiteSeo } from "@/lib/site-settings";
import { isMirrorShellPath } from "@/lib/store-mirror-paths";
import { getWhatsAppConfig } from "@/lib/whatsapp-settings";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  // Mirror shell sayfalarında Poppins kullanılmıyor; preload yalnızca admin/non-mirror için gerekli.
  // 400 (gövde) + 600 (başlık) yeterli — 500 ve 700'ü kaldırmak ~60KB tasarruf sağlar.
  weight: ["400", "600"],
  variable: "--font-poppins",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata();
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const seo = getSiteSeo(settings, site.name);
  const gaId = safeGoogleAnalyticsId(seo.googleAnalyticsId);
  const wa = getWhatsAppConfig(settings);
  const siteJsonLd = [buildOrganizationJsonLd(settings, site.name), buildWebSiteJsonLd(settings, site.name)];
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "/";
  const locale = localeFromCookieValue(h.get("x-shop-locale") ?? undefined) ?? "tr";
  const isAdminOrApi = pathname.startsWith("/admin") || pathname.startsWith("/api");
  const homepageMode = getHomepageMode(settings);
  const themeShellLive = readThemeShellPilotLive();
  const useMirrorIframeHome =
    !isAdminOrApi && pathname === "/" && homepageMode === "mirror" && !themeShellLive;
  const mirrorHomePreload = useMirrorIframeHome
    ? await resolveStoreMirrorIframeSrcForRequest(
        "theme/techizmet-shop/mirror/index-tr.html",
        "home",
      )
    : null;
  const isMirrorHome = useMirrorIframeHome;
  const mirrorHeroPreload = isMirrorHome
    ? await getMirrorHomeHeroPreloadHref(site.id, locale)
    : null;
  const mirrorShell =
    !isAdminOrApi && homepageMode === "mirror" && isMirrorShellPath(pathname) && !themeShellLive;

  // Mirror shell sayfalarında Poppins kullanılmıyor — font variable class'ı ekleme
  const bodyClass = mirrorShell ? "antialiased" : `${poppins.variable} antialiased`;

  return (
    <html lang={locale} data-shop-locale={locale}>
      <head>
        {/* Kritik dış domain'lere erken bağlantı — DNS+TCP+TLS maliyeti ~150-300ms azalır */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {gaId ? <link rel="preconnect" href="https://www.googletagmanager.com" /> : null}
        {gaId ? <link rel="dns-prefetch" href="https://www.google-analytics.com" /> : null}

        {/* Mirror iframe HTML'ini yüksek öncelikle ön yükle — sayfa açıldığında hazır olsun */}
        {mirrorHomePreload ? (
          <link rel="preload" href={mirrorHomePreload} as="fetch" crossOrigin="anonymous" />
        ) : null}

        {/* LCP hero görseli — iframe içinde yüklense de tarayıcıya önden ipucu verilir */}
        {mirrorHeroPreload ? (
          <link
            rel="preload"
            href={mirrorHeroPreload}
            as="image"
            fetchPriority="high"
          />
        ) : null}
      </head>
      <body className={bodyClass}>
        {!isAdminOrApi && (
          <>
            {gaId ? (
              <>
                <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="lazyOnload" />
                <Script id="ga-consent-default" strategy="lazyOnload">
                  {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});gtag('js',new Date());gtag('config','${gaId}');`}
                </Script>
              </>
            ) : null}
            <JsonLdScript data={siteJsonLd} />
            <LazyStoreWidgets
              googleAnalyticsId={gaId ?? ""}
              facebookPixelId={seo.facebookPixelId}
              cookieConsentJson={settings.cookieConsentJson ?? null}
              whatsapp={{
                digits: wa.digits,
                defaultMessage: wa.defaultMessage,
                floatingEnabled: wa.floatingEnabled,
                botEnabled: wa.botEnabled,
              }}
            />
          </>
        )}
        {children}
      </body>
    </html>
  );
}
