"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountRegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/account/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Kayıt başarısız");
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <div className="kn-account">
      <h1>Hesap oluştur</h1>
      <p className="kn-account__lead">Sipariş geçmişinizi görün ve sonraki alışverişlerinizi hızlandırın.</p>
      <form className="kn-account__form" onSubmit={submit}>
        <label>
          Ad
          <input
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
        </label>
        <label>
          Soyad
          <input
            required
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </label>
        <label>
          E-posta
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Telefon
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label>
          Şifre (min. 6)
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        {err ? <p className="kn-form-error">{err}</p> : null}
        <button type="submit" className="kn-btn kn-btn--primary kn-btn--block" disabled={busy}>
          {busy ? "…" : "Kayıt ol"}
        </button>
      </form>
      <p className="kn-account__footer">
        Zaten üye misiniz? <Link href="/account/login">Giriş yapın</Link>
      </p>
    </div>
  );
}
