"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function AccountResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (newPassword !== confirm) {
      setErr("Şifreler eşleşmiyor");
      return;
    }
    if (!token) {
      setErr("Geçersiz bağlantı");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/account/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    const j = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setErr(j.error ?? "Şifre güncellenemedi");
      return;
    }
    router.push("/account/login?reset=1");
    router.refresh();
  }

  if (!token) {
    return (
      <div className="kn-account">
        <h1>Geçersiz bağlantı</h1>
        <p className="kn-account__hint">Sıfırlama linki eksik veya süresi dolmuş olabilir.</p>
        <p className="kn-account__footer">
          <Link href="/account/forgot-password">Yeni bağlantı iste</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="kn-account">
      <h1>Yeni şifre belirle</h1>
      <form className="kn-account__form" onSubmit={submit}>
        <label>
          Yeni şifre (en az 8 karakter)
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label>
          Tekrar
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {err ? <p className="kn-form-error">{err}</p> : null}
        <button type="submit" className="kn-btn kn-btn--primary kn-btn--block" disabled={busy}>
          {busy ? "…" : "Şifreyi kaydet"}
        </button>
      </form>
    </div>
  );
}
