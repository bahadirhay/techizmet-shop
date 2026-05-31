"use client";

import { useState } from "react";
import { inputClass } from "@/components/admin/AdminForm";

export function StaffUserPasswordForm({ userId, username }: { userId: string; username: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirmPassword) {
      setMsg("Şifreler eşleşmiyor");
      return;
    }
    if (!window.confirm("Bu panel kullanıcısının şifresi değiştirilecek. Devam?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/staff-users/${userId}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    const j = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "Kaydedilemedi");
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setMsg(`${username} şifresi güncellendi.`);
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
      <p className="text-xs font-medium text-zinc-700">Şifre sıfırla</p>
      <input
        type="password"
        className={inputClass}
        placeholder="Yeni şifre (min 8)"
        minLength={8}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <input
        type="password"
        className={inputClass}
        placeholder="Tekrar"
        minLength={8}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <button
        type="submit"
        disabled={busy || !newPassword}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50"
      >
        {busy ? "…" : "Kaydet"}
      </button>
      {msg ? <p className="text-xs text-zinc-600">{msg}</p> : null}
    </form>
  );
}
