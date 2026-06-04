import { NextResponse } from "next/server";
import {
  getGoogleClientId,
  getStoreOrigin,
  isOAuthProviderEnabled,
  oauthCallbackUrl,
} from "@/lib/oauth/config";
import { issueOAuthState } from "@/lib/oauth/state";
import { sanitizeAccountReturnPath } from "@/lib/account-return-path";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getDefaultSite } from "@/lib/site";

export async function GET(req: Request) {
  if (!(await isOAuthProviderEnabled("google"))) {
    return NextResponse.json({ error: "Google giriş kapalı" }, { status: 503 });
  }

  const url = new URL(req.url);
  const returnTo = sanitizeAccountReturnPath(url.searchParams.get("next"));
  const state = await issueOAuthState("google", returnTo);

  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const clientId = getGoogleClientId(settings.customerAuth);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: oauthCallbackUrl("google"),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
