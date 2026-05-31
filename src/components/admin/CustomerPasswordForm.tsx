"use client";

import { useState } from "react";
import { inputClass } from "@/components/admin/AdminForm";

export function CustomerPasswordForm({
  customerId,
  email,
  hasPassword,
}: {
  customerId: string;
  email: string | null;
  hasPassword: boolean;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!email?.trim()) {
    return <p className="text-sm text-zinc-500">E-posta olmadan üye şifresi atanamaz.</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirmPassword) {
      setMsg("Şifreler eşleşmiyor");
      return;
    }
    if (!window.confirm(`${email} için ${hasPassword ? "şifre değiştirilsin" : "üyelik şifresi atansın"} mi?`)) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/customers/${customerId}/password`, {
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
    setMsg("Üye şifresi güncellendi.");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-zinc-600">
        {hasPassword ? "Kayıtlı üyenin şifresini panelden değiştirin." : "Misafir müşteriye üyelik şifresi atayın."}
      </p>
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
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Kaydediliyor…" : hasPassword ? "Üye şifresini güncelle" : "Üyelik şifresi ata"}
      </button>
      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
    </form>
  );
}
