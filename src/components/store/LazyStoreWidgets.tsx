"use client";

import dynamic from "next/dynamic";

// Kritik olmayan bileşenler — ayrı chunk'ta lazy yüklenir, ilk bundle'a girmez
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

type Props = {
  googleAnalyticsId: string;
  facebookPixelId?: string | null;
  cookieConsentJson?: string | null;
  whatsapp: {
    digits?: string | null;
    defaultMessage?: string | null;
    floatingEnabled?: boolean | null;
    botEnabled?: boolean | null;
  };
};

export function LazyStoreWidgets({ googleAnalyticsId, facebookPixelId, cookieConsentJson, whatsapp }: Props) {
  return (
    <>
      <ConsentAwareAnalytics
        googleAnalyticsId={googleAnalyticsId}
        facebookPixelId={facebookPixelId ?? ""}
      />
      <CookieConsentBanner rawConfig={cookieConsentJson} />
      <WhatsappSiteWidgets
        phoneDigits={whatsapp.digits ?? ""}
        defaultMessage={whatsapp.defaultMessage}
        floatingEnabled={whatsapp.floatingEnabled ?? false}
        botEnabled={whatsapp.botEnabled ?? false}
      />
      <StoreEventTracker />
      <MirrorAnalyticsBridge />
    </>
  );
}
