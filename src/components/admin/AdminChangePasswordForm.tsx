"use client";

import { useState } from "react";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";

export function AdminChangePasswordForm() {
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
    const res = await fetch("/api/admin/auth/change-password", {
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
    <form onSubmit={submit} className="max-w-md space-y-4">
      <AdminField label="Mevcut şifre">
        <input
          type="password"
          className={inputClass}
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </AdminField>
      <AdminField label="Yeni şifre (en az 8 karakter)">
        <input
          type="password"
          className={inputClass}
          autoComplete="new-password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </AdminField>
      <AdminField label="Yeni şifre (tekrar)">
        <input
          type="password"
          className={inputClass}
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </AdminField>
      {msg ? (
        <p className={`text-sm ${msg.includes("güncellendi") ? "text-green-700" : "text-red-600"}`}>{msg}</p>
      ) : null}
      <button type="submit" className={btnPrimary} disabled={busy}>
        {busy ? "Kaydediliyor…" : "Şifreyi güncelle"}
      </button>
    </form>
  );
}
