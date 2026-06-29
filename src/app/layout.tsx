import type { Metadata } from "next";
import Script from "next/script";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { headers } from "next/headers";
import { Poppins } from "next/font/google";
import { JsonLdScript } from "@/components/store/JsonLdScript";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/seo/site-json-ld";
import { safeGoogleAnalyticsId } from "@/lib/seo/google-analytics-id";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getMirrorHomeHeroPreloadHref } from "@/lib/mirror-home-hero-preload";
import { resolveStoreMirrorIframeSrcForRequest } from "@/lib/mirror-prebuilt-resolve-server";
import { getDefaultSite } from "@/lib/site";
import { getHomepageMode, getSiteSeo } from "@/lib/site-settings";
import { isMirrorShellPath } from "@/lib/store-mirror-paths";
import { getWhatsAppConfig } from "@/lib/whatsapp-settings";
import "./globals.css";

// İlk render için kritik olmayan bileşenler — ayrı chunk'ta lazy load edilir
const CookieConsentBanner = dynamic(
  () => import("@/components/store/CookieConsentBanner").then((m) => m.CookieConsentBanner),
  { ssr: false },
);
const ConsentAwareAnalytics = dynamic(
  () => import("@/components/store/ConsentAwareAnalytics").then((m) => m.ConsentAwareAnalytics),
  { ssr: false },
);
const WhatsappSiteWidgets = dynamic(
  () => import("@/components/store/WhatsappSiteWidgets").then((m) => m.WhatsappSiteWidgets),
  { ssr: false },
);
const StoreEventTracker = dynamic(
  () => import("@/components/store/StoreEventTracker").then((m) => m.StoreEventTracker),
  { ssr: false },
);
const MirrorAnalyticsBridge = dynamic(
  () => import("@/components/store/MirrorAnalyticsBridge").then((m) => m.MirrorAnalyticsBridge),
  { ssr: false },
);

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
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
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const isAdminOrApi = pathname.startsWith("/admin") || pathname.startsWith("/api");
  const mirrorHomePreload = isAdminOrApi
    ? null
    : await resolveStoreMirrorIframeSrcForRequest(
        "theme/techizmet-shop/mirror/index-tr.html",
        "home",
      );
  const isMirrorHome =
    !isAdminOrApi && pathname === "/" && getHomepageMode(settings) === "mirror";
  const mirrorHeroPreload = isMirrorHome ? await getMirrorHomeHeroPreloadHref(site.id, "tr") : null;
  const mirrorShell =
    !isAdminOrApi && getHomepageMode(settings) === "mirror" && isMirrorShellPath(pathname);

  return (
    <html lang="tr">
      <head>
        {/* mirrorHeroPreload ana frame'de kullanılmıyor (iframe içinde yükleniyor) — preload kaldırıldı */}
        {/* as="document" rel="preload" için desteklenmiyor; prefetch olarak bırakıldı */}
        {mirrorHomePreload ? <link rel="prefetch" href={mirrorHomePreload} /> : null}
      </head>
      <body className={mirrorShell ? "antialiased" : `${poppins.variable} antialiased`}>
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
            <ConsentAwareAnalytics
              googleAnalyticsId={gaId ?? ""}
              facebookPixelId={seo.facebookPixelId}
            />
            <CookieConsentBanner rawConfig={settings.cookieConsentJson} />
            <WhatsappSiteWidgets
              phoneDigits={wa.digits}
              defaultMessage={wa.defaultMessage}
              floatingEnabled={wa.floatingEnabled}
              botEnabled={wa.botEnabled}
            />
            <StoreEventTracker />
            <MirrorAnalyticsBridge />
          </>
        )}
        {children}
      </body>
    </html>
  );
}
