"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  accountLoginPath,
  sanitizeAccountReturnPath,
} from "@/lib/account-return-path";
import { formatTaxIdInput } from "@/lib/efatura/consumer-tax-id";

export function AccountRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeAccountReturnPath(searchParams.get("next"));
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    b2bApplication: false,
    companyName: "",
    taxId: "",
    taxOffice: "",
    b2bApplicationNote: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [b2bPending, setB2bPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/account/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        b2bApplication: form.b2bApplication ? "1" : "",
      }),
    });
    const json = (await res.json()) as { error?: string; b2bPending?: boolean };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Kayıt başarısız");
      return;
    }
    if (json.b2bPending) {
      setB2bPending(true);
      return;
    }
    router.push(returnTo);
    router.refresh();
  }

  if (b2bPending) {
    return (
      <div className="kn-account">
        <h1>Başvurunuz alındı</h1>
        <p className="kn-account__lead">
          B2B / toptan üyelik başvurunuz inceleniyor. Onaylandığında size özel indirim oranı ve
          ödeme koşulları tanımlanacak; e-posta ile bilgilendirileceksiniz.
        </p>
        <Link href={accountLoginPath(returnTo)} className="kn-btn kn-btn--primary kn-btn--block">
          Hesabıma git
        </Link>
      </div>
    );
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

        <label className="kn-account__b2b-toggle">
          <input
            type="checkbox"
            checked={form.b2bApplication}
            onChange={(e) => setForm({ ...form, b2bApplication: e.target.checked })}
          />
          <span>B2B / toptan müşteri başvurusu (admin onayı gerekir)</span>
        </label>

        {form.b2bApplication ? (
          <div className="kn-account__b2b-fields">
            <label>
              Firma ünvanı *
              <input
                required={form.b2bApplication}
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </label>
            <label>
              VKN / TCKN
              <input
                inputMode="numeric"
                value={form.taxId}
                onChange={(e) =>
                  setForm({ ...form, taxId: formatTaxIdInput(e.target.value) })
                }
              />
            </label>
            <label>
              Vergi dairesi
              <input
                value={form.taxOffice}
                onChange={(e) => setForm({ ...form, taxOffice: e.target.value })}
              />
            </label>
            <label>
              Başvuru notu
              <textarea
                rows={3}
                value={form.b2bApplicationNote}
                onChange={(e) => setForm({ ...form, b2bApplicationNote: e.target.value })}
                placeholder="Ciro, ürün grubu, ödeme tercihi…"
              />
            </label>
          </div>
        ) : null}

        {err ? <p className="kn-form-error">{err}</p> : null}
        <button type="submit" className="kn-btn kn-btn--primary kn-btn--block" disabled={busy}>
          {busy ? "…" : form.b2bApplication ? "B2B başvurusu gönder" : "Kayıt ol"}
        </button>
      </form>
      <p className="kn-account__footer">
        Zaten üye misiniz? <Link href={accountLoginPath(returnTo)}>Giriş yapın</Link>
      </p>
    </div>
  );
}
