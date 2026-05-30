"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent-choice-v1";
const PREFS_KEY = "cookie-consent-prefs-v1";

function analyticsAllowed(): boolean {
  try {
    const choice = window.localStorage.getItem(STORAGE_KEY);
    if (!choice || choice === "rejected") return false;
    if (choice === "accepted") return true;
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return true;
    const prefs = JSON.parse(raw) as Record<string, boolean>;
    return prefs.analytics !== false;
  } catch {
    return false;
  }
}

export function ConsentAwareAnalytics({
  googleAnalyticsId,
  facebookPixelId,
}: {
  googleAnalyticsId: string;
  facebookPixelId: string;
}) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(analyticsAllowed());
    const onConsent = () => setAllowed(analyticsAllowed());
    window.addEventListener("kn-cookie-consent", onConsent);
    window.addEventListener("storage", onConsent);
    return () => {
      window.removeEventListener("kn-cookie-consent", onConsent);
      window.removeEventListener("storage", onConsent);
    };
  }, []);

  if (!allowed) return null;

  return (
    <>
      {googleAnalyticsId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} strategy="afterInteractive" />
          <Script id="kn-gtag" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${googleAnalyticsId}');`}
          </Script>
        </>
      ) : null}
      {facebookPixelId ? (
        <Script id="kn-fbpixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${facebookPixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}
    </>
  );
}
