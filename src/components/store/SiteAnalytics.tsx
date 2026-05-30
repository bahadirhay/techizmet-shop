import { getDefaultSite } from "@/lib/site";
import { getSiteSeo, getSiteSettings } from "@/lib/site-settings";

/** GA4 + Facebook Pixel — tüm sayfalar */
export async function SiteAnalytics() {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const seo = getSiteSeo(settings, site.name);

  if (!seo.googleAnalyticsId && !seo.facebookPixelId && !seo.extraHeadHtml) {
    return null;
  }

  return (
    <>
      {seo.googleAnalyticsId ? (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${seo.googleAnalyticsId}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${seo.googleAnalyticsId}');`,
            }}
          />
        </>
      ) : null}
      {seo.facebookPixelId ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${seo.facebookPixelId}');fbq('track','PageView');`,
          }}
        />
      ) : null}
      {seo.extraHeadHtml ? <div dangerouslySetInnerHTML={{ __html: seo.extraHeadHtml }} /> : null}
    </>
  );
}
