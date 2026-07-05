"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { sanitizeAccountReturnPath } from "@/lib/account-return-path";

export function SocialLoginButtons() {
  const searchParams = useSearchParams();
  const returnTo = sanitizeAccountReturnPath(searchParams.get("next"));
  const [providers, setProviders] = useState({ google: false, apple: false });

  useEffect(() => {
    fetch("/api/account/oauth/status")
      .then((r) => r.json())
      .then((d: { google?: boolean; apple?: boolean }) => {
        setProviders({ google: !!d.google, apple: !!d.apple });
      })
      .catch(() => {});
  }, []);

  if (!providers.google && !providers.apple) return null;

  const q = `?next=${encodeURIComponent(returnTo)}`;

  return (
    <div className="kn-account__social">
      <p className="account--text-info text-center text-small">veya</p>
      {providers.google ? (
        <a href={`/api/account/oauth/google${q}`} className="button medium-button button-block">
          Google ile devam et
        </a>
      ) : null}
      {providers.apple ? (
        <a
          href={`/api/account/oauth/apple${q}`}
          className="button medium-button button-block"
          style={{ marginTop: "0.5rem" }}
        >
          Apple ile devam et
        </a>
      ) : null}
    </div>
  );
}
