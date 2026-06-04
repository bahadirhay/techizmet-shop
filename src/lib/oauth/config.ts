import "server-only";

import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getDefaultSite } from "@/lib/site";

export type OAuthProvider = "google" | "apple";

/** Sosyal giriş varsayılan kapalı — yalnızca panelde açıkça etkinleştirilirse çalışır. */
export async function isOAuthProviderEnabled(provider: OAuthProvider): Promise<boolean> {
  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const auth = settings.customerAuth ?? {};
  if (provider === "google") {
    if (auth.googleEnabled !== true) return false;
    return Boolean(getGoogleClientId(auth)) && Boolean(getGoogleClientSecret());
  }
  if (auth.appleEnabled !== true) return false;
  return (
    Boolean(getAppleClientId(auth)) && Boolean(process.env.APPLE_CLIENT_SECRET?.trim())
  );
}

export function getGoogleClientId(auth?: { googleClientId?: string }) {
  return auth?.googleClientId?.trim() || process.env.GOOGLE_CLIENT_ID?.trim() || "";
}

export function getGoogleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
}

export function getAppleClientId(auth?: { appleClientId?: string }) {
  return auth?.appleClientId?.trim() || process.env.APPLE_CLIENT_ID?.trim() || "";
}

export function getStoreOrigin() {
  return (process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:5555").replace(/\/$/, "");
}

export function oauthCallbackUrl(provider: OAuthProvider) {
  return `${getStoreOrigin()}/api/account/oauth/${provider}/callback`;
}
