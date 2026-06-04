import { NextResponse } from "next/server";
import {
  getGoogleClientId,
  getGoogleClientSecret,
  getStoreOrigin,
  oauthCallbackUrl,
} from "@/lib/oauth/config";
import { consumeOAuthState } from "@/lib/oauth/state";
import { findOrCreateOAuthCustomer } from "@/lib/oauth/customer-oauth";
import { sanitizeAccountReturnPath } from "@/lib/account-return-path";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getDefaultSite } from "@/lib/site";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const origin = getStoreOrigin();

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/account/login?error=oauth`);
  }

  const consumed = await consumeOAuthState("google", state);
  if (consumed === null) {
    return NextResponse.redirect(`${origin}/account/login?error=oauth_state`);
  }
  const returnTo = sanitizeAccountReturnPath(consumed);

  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const clientId = getGoogleClientId(settings.customerAuth);
  const clientSecret = getGoogleClientSecret();
  if (!clientSecret) {
    return NextResponse.redirect(`${origin}/account/login?error=oauth_config`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: oauthCallbackUrl("google"),
      grant_type: "authorization_code",
    }),
  });

  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokenJson.access_token) {
    return NextResponse.redirect(`${origin}/account/login?error=oauth_token`);
  }

  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profile = (await profileRes.json()) as {
    sub?: string;
    email?: string;
    given_name?: string;
    family_name?: string;
  };

  if (!profile.email || !profile.sub) {
    return NextResponse.redirect(`${origin}/account/login?error=oauth_email`);
  }

  try {
    await findOrCreateOAuthCustomer({
      siteId: site.id,
      email: profile.email,
      firstName: profile.given_name ?? null,
      lastName: profile.family_name ?? null,
      googleSub: profile.sub,
    });
  } catch {
    return NextResponse.redirect(`${origin}/account/login?error=oauth`);
  }

  return NextResponse.redirect(`${origin}${returnTo}`);
}
