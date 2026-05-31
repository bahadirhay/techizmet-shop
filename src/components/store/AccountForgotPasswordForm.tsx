"use client";

import Link from "next/link";
import { useState } from "react";

export function AccountForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setDevUrl(null);
    const res = await fetch("/api/account/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const j = (await res.json()) as { message?: string; error?: string; devResetUrl?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "İşlem başarısız");
      return;
    }
    setMsg(j.message ?? "E-posta gönderildi.");
    if (j.devResetUrl) setDevUrl(j.devResetUrl);
  }

  return (
    <div className="kn-account">
      <h1>Şifremi unuttum</h1>
      <p className="kn-account__hint">Kayıtlı e-posta adresinize sıfırlama bağlantısı gönderilir.</p>
      <form className="kn-account__form" onSubmit={submit}>
        <label>
          E-posta
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {msg ? <p className="kn-form-success">{msg}</p> : null}
        {devUrl ? (
          <p className="kn-form-hint">
            Geliştirme:{" "}
            <a href={devUrl} className="underline">
              sıfırlama bağlantısı
            </a>
          </p>
        ) : null}
        <button type="submit" className="kn-btn kn-btn--primary kn-btn--block" disabled={busy}>
          {busy ? "…" : "Bağlantı gönder"}
        </button>
      </form>
      <p className="kn-account__footer">
        <Link href="/account/login">← Giriş sayfası</Link>
      </p>
    </div>
  );
}
