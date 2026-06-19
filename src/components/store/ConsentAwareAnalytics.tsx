"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent-choice-v1";
const PREFS_KEY = "cookie-consent-prefs-v1";

function readConsentState(): { analytics: boolean; marketing: boolean } {
  try {
    const choice = window.localStorage.getItem(STORAGE_KEY);
    if (!choice || choice === "rejected") return { analytics: false, marketing: false };
    if (choice === "accepted") return { analytics: true, marketing: true };
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { analytics: true, marketing: true };
    const prefs = JSON.parse(raw) as Record<string, boolean>;
    return {
      analytics: prefs.analytics !== false,
      marketing: prefs.marketing !== false,
    };
  } catch {
    return { analytics: false, marketing: false };
  }
}

function applyGtagConsent(analytics: boolean, marketing: boolean) {
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;
  gtag("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
  });
}

/** Çerez tercihine göre gtag consent günceller + Facebook Pixel yükler */
export function ConsentAwareAnalytics({
  googleAnalyticsId,
  facebookPixelId,
}: {
  googleAnalyticsId: string;
  facebookPixelId: string;
}) {
  const fbId = facebookPixelId?.trim();
  const [marketingAllowed, setMarketingAllowed] = useState(false);

  useEffect(() => {
    const sync = () => {
      const state = readConsentState();
      if (googleAnalyticsId) applyGtagConsent(state.analytics, state.marketing);
      setMarketingAllowed(state.marketing);
    };
    sync();
    window.addEventListener("kn-cookie-consent", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("kn-cookie-consent", sync);
      window.removeEventListener("storage", sync);
    };
  }, [googleAnalyticsId]);

  if (!fbId || !marketingAllowed) return null;

  return (
    <Script id="kn-fbpixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbId.replace(/'/g, "")}');fbq('track','PageView');`}
    </Script>
  );
}
