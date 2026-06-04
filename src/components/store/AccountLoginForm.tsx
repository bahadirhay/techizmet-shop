"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  accountRegisterPath,
  sanitizeAccountReturnPath,
} from "@/lib/account-return-path";
import { SocialLoginButtons } from "@/components/store/SocialLoginButtons";

export function AccountLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeAccountReturnPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/account/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Giriş başarısız");
      return;
    }
    router.push(returnTo);
    router.refresh();
  }

  return (
    <div className="kn-account">
      <h1>Giriş yap</h1>
      <form className="kn-account__form" onSubmit={submit}>
        <label>
          E-posta
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Şifre
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <p className="kn-account__hint">
          <Link href="/account/forgot-password">Şifremi unuttum</Link>
        </p>
        {err ? <p className="kn-form-error">{err}</p> : null}
        <button type="submit" className="kn-btn kn-btn--primary kn-btn--block" disabled={busy}>
          {busy ? "…" : "Giriş"}
        </button>
      </form>
      <SocialLoginButtons />
      <p className="kn-account__footer">
        Hesabınız yok mu? <Link href={accountRegisterPath(returnTo)}>Kayıt olun</Link>
        <br />
        <Link href="/orders/track">Sipariş takip</Link> (misafir)
      </p>
    </div>
  );
}
