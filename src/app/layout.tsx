import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { CookieConsentBanner } from "@/components/store/CookieConsentBanner";
import { ConsentAwareAnalytics } from "@/components/store/ConsentAwareAnalytics";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { getDefaultSite } from "@/lib/site";
import { getSiteSeo, getSiteSettings } from "@/lib/site-settings";
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
  const settings = await getSiteSettings(site.id);
  const seo = getSiteSeo(settings, site.name);

  return (
    <html lang="tr">
      <body className={`${poppins.variable} antialiased`}>
        <ConsentAwareAnalytics
          googleAnalyticsId={seo.googleAnalyticsId}
          facebookPixelId={seo.facebookPixelId}
        />
        <CookieConsentBanner rawConfig={settings.cookieConsentJson} />
        {children}
      </body>
    </html>
  );
}
