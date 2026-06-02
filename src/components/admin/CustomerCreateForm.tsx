"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";

export function CustomerCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    type: "guest",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    notes: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) return setMsg(j.error ?? "Kayıt oluşturulamadı.");
    router.push("/admin/customers");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="admin-card admin-card-pad max-w-2xl space-y-4">
      <AdminField label="Kayıt tipi">
        <select className={inputClass} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
          <option value="guest">Müşteri (misafir)</option>
          <option value="member">Üye (şifreli)</option>
        </select>
      </AdminField>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Ad">
          <input className={inputClass} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
        </AdminField>
        <AdminField label="Soyad">
          <input className={inputClass} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
        </AdminField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="E-posta">
          <input className={inputClass} type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </AdminField>
        <AdminField label="Telefon">
          <input className={inputClass} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </AdminField>
      </div>
      {form.type === "member" ? (
        <AdminField label="Şifre">
          <input className={inputClass} type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        </AdminField>
      ) : null}
      <AdminField label="Not">
        <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </AdminField>
      <button disabled={busy} className={btnPrimary} type="submit">
        {busy ? "Kaydediliyor..." : "Kaydet"}
      </button>
      {msg ? <p className="text-sm text-rose-600">{msg}</p> : null}
    </form>
  );
}
