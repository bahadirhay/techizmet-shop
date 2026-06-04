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
    <div className="kn-account__social mt-4 space-y-2">
      <p className="text-center text-xs text-zinc-500">veya</p>
      {providers.google ? (
        <a
          href={`/api/account/oauth/google${q}`}
          className="kn-btn kn-btn--block flex items-center justify-center gap-2 border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
        >
          Google ile devam et
        </a>
      ) : null}
      {providers.apple ? (
        <a
          href={`/api/account/oauth/apple${q}`}
          className="kn-btn kn-btn--block flex items-center justify-center gap-2 border border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800"
        >
          Apple ile devam et
        </a>
      ) : null}
    </div>
  );
}
