"use client";

import { useState } from "react";

export function AccountChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirm) {
      setMsg("Yeni şifreler eşleşmiyor");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const j = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "Kaydedilemedi");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    setMsg("Şifreniz güncellendi.");
  }

  return (
    <form onSubmit={submit} className="kn-account__form kn-account__form--compact">
      <h2 className="kn-account__section-title">Şifre değiştir</h2>
      <label>
        Mevcut şifre
        <input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </label>
      <label>
        Yeni şifre
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </label>
      <label>
        Yeni şifre (tekrar)
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </label>
      {msg ? (
        <p className={msg.includes("güncellendi") ? "kn-form-success" : "kn-form-error"}>{msg}</p>
      ) : null}
      <button type="submit" className="kn-btn kn-btn--secondary" disabled={busy}>
        {busy ? "…" : "Şifreyi güncelle"}
      </button>
    </form>
  );
}
