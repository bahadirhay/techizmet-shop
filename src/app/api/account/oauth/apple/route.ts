import { NextResponse } from "next/server";
import {
  getAppleClientId,
  isOAuthProviderEnabled,
  oauthCallbackUrl,
} from "@/lib/oauth/config";
import { issueOAuthState } from "@/lib/oauth/state";
import { sanitizeAccountReturnPath } from "@/lib/account-return-path";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getDefaultSite } from "@/lib/site";

export async function GET(req: Request) {
  if (!(await isOAuthProviderEnabled("apple"))) {
    return NextResponse.json({ error: "Apple giriş kapalı" }, { status: 503 });
  }

  const url = new URL(req.url);
  const returnTo = sanitizeAccountReturnPath(url.searchParams.get("next"));
  const state = await issueOAuthState("apple", returnTo);

  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const clientId = getAppleClientId(settings.customerAuth);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: oauthCallbackUrl("apple"),
    response_type: "code id_token",
    response_mode: "form_post",
    scope: "name email",
    state,
  });

  return NextResponse.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
}
