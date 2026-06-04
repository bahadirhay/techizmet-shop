import { NextResponse } from "next/server";
import {
  getAppleClientId,
  getStoreOrigin,
  oauthCallbackUrl,
} from "@/lib/oauth/config";
import { decodeJwtPayload, resolveAppleClientSecret } from "@/lib/oauth/apple-token";
import { consumeOAuthState } from "@/lib/oauth/state";
import { findOrCreateOAuthCustomer } from "@/lib/oauth/customer-oauth";
import { sanitizeAccountReturnPath } from "@/lib/account-return-path";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getDefaultSite } from "@/lib/site";

async function handleAppleCallback(req: Request) {
  const origin = getStoreOrigin();
  let code = "";
  let state = "";
  let idToken = "";
  let userJson = "";

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    code = String(form.get("code") ?? "");
    state = String(form.get("state") ?? "");
    idToken = String(form.get("id_token") ?? "");
    userJson = String(form.get("user") ?? "");
  } else {
    const url = new URL(req.url);
    code = url.searchParams.get("code") ?? "";
    state = url.searchParams.get("state") ?? "";
    idToken = url.searchParams.get("id_token") ?? "";
  }

  if (!state) {
    return NextResponse.redirect(`${origin}/account/login?error=oauth_state`);
  }

  const consumed = await consumeOAuthState("apple", state);
  if (consumed === null) {
    return NextResponse.redirect(`${origin}/account/login?error=oauth_state`);
  }
  const returnTo = sanitizeAccountReturnPath(consumed);

  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const clientId = getAppleClientId(settings.customerAuth);
  const clientSecret = resolveAppleClientSecret();

  let email = "";
  let sub = "";
  let firstName: string | null = null;
  let lastName: string | null = null;

  if (idToken) {
    const claims = decodeJwtPayload(idToken);
    email = String(claims?.email ?? "");
    sub = String(claims?.sub ?? "");
  }

  if (userJson) {
    try {
      const u = JSON.parse(userJson) as {
        name?: { firstName?: string; lastName?: string };
        email?: string;
      };
      firstName = u.name?.firstName ?? null;
      lastName = u.name?.lastName ?? null;
      if (u.email) email = u.email;
    } catch {
      /* ignore */
    }
  }

  if ((!email || !sub) && code && clientSecret) {
    const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: oauthCallbackUrl("apple"),
      }),
    });
    const tokenJson = (await tokenRes.json()) as { id_token?: string };
    if (tokenJson.id_token) {
      const claims = decodeJwtPayload(tokenJson.id_token);
      email = email || String(claims?.email ?? "");
      sub = sub || String(claims?.sub ?? "");
    }
  }

  if (!email || !sub) {
    return NextResponse.redirect(`${origin}/account/login?error=oauth_email`);
  }

  try {
    await findOrCreateOAuthCustomer({
      siteId: site.id,
      email,
      firstName,
      lastName,
      appleSub: sub,
    });
  } catch {
    return NextResponse.redirect(`${origin}/account/login?error=oauth`);
  }

  return NextResponse.redirect(`${origin}${returnTo}`);
}

export async function POST(req: Request) {
  return handleAppleCallback(req);
}

export async function GET(req: Request) {
  return handleAppleCallback(req);
}
