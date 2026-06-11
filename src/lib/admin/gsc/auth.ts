import "server-only";

import crypto from "crypto";

export type GscServiceAccount = {
  client_email: string;
  private_key: string;
};

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function parseGscServiceAccountFromEnv(): GscServiceAccount | null {
  const jsonRaw = process.env.GSC_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as Partial<GscServiceAccount>;
      const email = parsed.client_email?.trim();
      const key = parsed.private_key?.trim();
      if (email && key) return { client_email: email, private_key: key.replace(/\\n/g, "\n") };
    } catch {
      return null;
    }
  }

  const email = process.env.GSC_CLIENT_EMAIL?.trim();
  const key = process.env.GSC_PRIVATE_KEY?.trim()?.replace(/\\n/g, "\n");
  if (email && key) return { client_email: email, private_key: key };
  return null;
}

export async function getGscAccessToken(account: GscServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signInput = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signInput);
  sign.end();
  const signature = base64url(sign.sign(account.private_key));
  const assertion = `${signInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(15000),
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GSC token alınamadı (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("GSC access_token boş");
  return data.access_token;
}
