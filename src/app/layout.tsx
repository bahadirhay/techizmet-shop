import type { Metadata } from "next";
import { Suspense } from "react";
import { Poppins } from "next/font/google";
import { CookieConsentBanner } from "@/components/store/CookieConsentBanner";
import { ConsentAwareAnalytics } from "@/components/store/ConsentAwareAnalytics";
import { MirrorAnalyticsBridge } from "@/components/store/MirrorAnalyticsBridge";
import { StoreEventTracker } from "@/components/store/StoreEventTracker";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
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

  return (
    <html lang="tr">
      <head>
        <link
          rel="preload"
          href="/_mirror-prebuilt/theme/techizmet-shop/mirror/index-tr.html"
          as="document"
        />
      </head>
      <body className={`${poppins.variable} antialiased`}>
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
