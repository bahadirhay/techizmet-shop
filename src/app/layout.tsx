import type { Metadata } from "next";
import { Suspense } from "react";
import { Poppins } from "next/font/google";
import { CookieConsentBanner } from "@/components/store/CookieConsentBanner";
import { ConsentAwareAnalytics } from "@/components/store/ConsentAwareAnalytics";
import { MirrorAnalyticsBridge } from "@/components/store/MirrorAnalyticsBridge";
import { StoreEventTracker } from "@/components/store/StoreEventTracker";
import { JsonLdScript } from "@/components/store/JsonLdScript";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/seo/site-json-ld";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { resolveStoreMirrorIframeSrcForRequest } from "@/lib/mirror-prebuilt-resolve";
import { getDefaultSite } from "@/lib/site";
import { getSiteSeo } from "@/lib/site-settings";
import "./globals.css";

export const revalidate = 300;

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata();
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const seo = getSiteSeo(settings, site.name);
  const siteJsonLd = [buildOrganizationJsonLd(settings, site.name), buildWebSiteJsonLd(settings, site.name)];
  const mirrorHomePreload = await resolveStoreMirrorIframeSrcForRequest(
    "theme/techizmet-shop/mirror/index-tr.html",
  );

  return (
    <html lang="tr">
      <head>
        <link rel="preload" href={mirrorHomePreload} as="document" />
      </head>
      <body className={`${poppins.variable} antialiased`}>
        <JsonLdScript data={siteJsonLd} />
        <ConsentAwareAnalytics
          googleAnalyticsId={seo.googleAnalyticsId}
          facebookPixelId={seo.facebookPixelId}
        />
        <CookieConsentBanner rawConfig={settings.cookieConsentJson} />
        <Suspense fallback={null}>
          <StoreEventTracker />
          <MirrorAnalyticsBridge />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
