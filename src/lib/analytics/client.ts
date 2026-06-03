"use client";

const STORAGE_KEY = "cookie-consent-choice-v1";
const PREFS_KEY = "cookie-consent-prefs-v1";

/** İstatistik çerezleri onaylı mı — GA ile aynı mantık */
export function analyticsConsentAllowed(): boolean {
  if (typeof window === "undefined") return false;
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

export type ClientStoreEvent = {
  type: string;
  payload: Record<string, unknown>;
};

export function sendStoreEvents(events: ClientStoreEvent[], utm?: Record<string, string>) {
  if (!events.length || !analyticsConsentAllowed()) return;

  const body = JSON.stringify({ events, utm });
  const url = "/api/events";

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(url, blob)) return;
  }

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function readUtmFromLocation(): Record<string, string> | undefined {
  if (typeof window === "undefined") return undefined;
  const q = new URLSearchParams(window.location.search);
  const utmSource = q.get("utm_source") ?? undefined;
  const utmMedium = q.get("utm_medium") ?? undefined;
  const utmCampaign = q.get("utm_campaign") ?? undefined;
  if (!utmSource && !utmMedium && !utmCampaign) return undefined;
  return {
    ...(utmSource ? { utmSource } : {}),
    ...(utmMedium ? { utmMedium } : {}),
    ...(utmCampaign ? { utmCampaign } : {}),
  };
}
