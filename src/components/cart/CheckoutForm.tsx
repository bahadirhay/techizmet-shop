"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import { formatTry } from "@/lib/format";
import type { ShippingOption } from "@/lib/cart/types";
import type { CheckoutPrefill } from "@/lib/checkout/prefill";

type PaymentFlags = {
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  cardEnabled: boolean;
  bankAccounts: { bank: string; iban: string; holder: string }[];
};

function addressToForm(a: CheckoutPrefill["addresses"][0]) {
  return {
    firstName: a.firstName ?? "",
    lastName: a.lastName ?? "",
    phone: a.phone ?? "",
    city: a.city,
    district: a.district,
    line1: a.line1,
    postalCode: a.postalCode ?? "",
  };
}

function topNavigate(url: string) {
  if (typeof window !== "undefined" && window.top && window.top !== window) {
    window.top.location.href = url;
    return true;
  }
  return false;
}

export function CheckoutForm({
  payment,
  prefill,
  embed = false,
}: {
  payment: PaymentFlags;
  prefill?: CheckoutPrefill | null;
  embed?: boolean;
}) {
  const router = useRouter();
  const { cart, refresh } = useCart();
  const [shipping, setShipping] = useState<ShippingOption[]>([]);
  const [freeShipping, setFreeShipping] = useState(false);
  const [carrierId, setCarrierId] = useState("");
  const [rateId, setRateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createAccount, setCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPassword2, setAccountPassword2] = useState("");

  const defaultAddr = prefill?.addresses.find((a) => a.isDefault) ?? prefill?.addresses[0];
  const addrFields = defaultAddr ? addressToForm(defaultAddr) : null;

  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddr?.id ?? "");
  const [form, setForm] = useState({
    email: prefill?.email ?? "",
    phone: prefill?.phone || addrFields?.phone || "",
    firstName: prefill?.firstName || addrFields?.firstName || "",
    lastName: prefill?.lastName || addrFields?.lastName || "",
    city: addrFields?.city ?? "",
    district: addrFields?.district ?? "",
    line1: addrFields?.line1 ?? "",
    postalCode: addrFields?.postalCode ?? "",
    paymentMethod: payment.codEnabled
      ? "cod"
      : payment.bankTransferEnabled
        ? "bank_transfer"
        : payment.cardEnabled
          ? "card"
          : "cod",
    acceptTerms: false,
  });

  useEffect(() => {
    refresh();
    fetch("/api/checkout/shipping", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j: { options: ShippingOption[]; freeShipping: boolean }) => {
        setShipping(j.options ?? []);
        setFreeShipping(Boolean(j.freeShipping));
        if (j.options?.[0]) {
          setCarrierId(j.options[0].carrierId);
          setRateId(j.options[0].rateId);
        }
      });
  }, [refresh]);

  useEffect(() => {
    if (!embed || typeof window === "undefined") return;
    function reportHeight() {
      const h = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: "kn-checkout-resize", height: h }, "*");
    }
    reportHeight();
    const ro = new ResizeObserver(reportHeight);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [embed, cart, shipping, err, busy, createAccount, form]);

  if (!cart || cart.items.length === 0) {
    return (
      <div className={embed ? "kn-checkout-page kn-checkout-page--embed" : "kn-checkout-page"}>
        {!embed ? (
          <header className="kn-checkout-page__banner">
            <h1>Ödeme</h1>
          </header>
        ) : null}
        <div className="kn-checkout kn-checkout--empty">
          <p>Sepetiniz boş.</p>
          <Link href="/collections/all" className="button medium-button button-block" {...(embed ? { target: "_top" } : {})}>
            Alışverişe başla
          </Link>
        </div>
      </div>
    );
  }

  const selectedShip = shipping.find((o) => o.carrierId === carrierId && o.rateId === rateId);
  const shipMinor = freeShipping ? 0 : (selectedShip?.priceMinor ?? 0);
  const grandTotal = cart.totalMinor + shipMinor;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!prefill?.loggedIn && createAccount) {
      if (accountPassword.length < 6) {
        setErr("Hesap şifresi en az 6 karakter olmalı");
        return;
      }
      if (accountPassword !== accountPassword2) {
        setErr("Şifreler eşleşmiyor");
        return;
      }
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        ...form,
        carrierId: freeShipping ? shipping[0]?.carrierId ?? "" : carrierId,
        rateId: freeShipping ? shipping[0]?.rateId ?? "" : rateId,
        createAccount: !prefill?.loggedIn && createAccount,
        accountPassword: !prefill?.loggedIn && createAccount ? accountPassword : undefined,
      }),
    });
    const j = (await res.json()) as {
      error?: string;
      orderNumber?: string;
      paymentRequired?: boolean;
      redirectUrl?: string;
      accountCreated?: boolean;
    };
    setBusy(false);
    if (!res.ok) {
      setErr(j.error ?? "Sipariş tamamlanamadı");
      return;
    }
    if (j.paymentRequired && j.redirectUrl) {
      if (!topNavigate(j.redirectUrl)) {
        router.push(j.redirectUrl);
        router.refresh();
      }
      return;
    }
    const q = new URLSearchParams({ order: j.orderNumber ?? "" });
    if (j.accountCreated) q.set("account", "1");
    const successUrl = `/checkout/success?${q.toString()}`;
    if (!topNavigate(successUrl)) {
      router.push(successUrl);
      router.refresh();
    }
  }

  const pageClass = embed ? "kn-checkout-page kn-checkout-page--embed" : "kn-checkout-page";
  const linkProps = embed ? { target: "_top" as const } : {};

  return (
    <div className={pageClass}>
      {!embed ? (
        <header className="kn-checkout-page__banner">
          <h1>Ödeme</h1>
          {prefill?.loggedIn ? (
            <p>
              <Link href="/account" {...linkProps}>Hesabınız</Link> ile giriş yaptınız — kayıtlı adresinizi seçebilir veya yeni adres girebilirsiniz.
            </p>
          ) : (
            <p>
              Misafir olarak devam edebilirsiniz —{" "}
              <Link href="/account/login?next=/checkout" {...linkProps}>giriş yapın</Link> kayıtlı adresleriniz için.
            </p>
          )}
        </header>
      ) : null}
      <form className="kn-checkout" onSubmit={submit}>
      <div className="kn-checkout__grid">
        <div className="kn-checkout__main">
          <section className="kn-checkout__section">
            <h2>İletişim</h2>
            <div className="kn-form-grid input-form--fields">
              <div className="form-group">
                <label htmlFor="kn-checkout-email">E-posta *</label>
                <input
                  id="kn-checkout-email"
                  className="form-control"
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="kn-checkout-phone">Telefon *</label>
                <input
                  id="kn-checkout-phone"
                  className="form-control"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
          </section>
          {!prefill?.loggedIn ? (
            <section className="kn-checkout__section kn-checkout__account-offer">
              <h2>Hızlı üyelik</h2>
              <label className="kn-checkout__account-toggle">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                />
                <span>
                  Siparişten sonra hesap oluştur — sipariş takibi, adres defteri ve favoriler için
                  (isteğe bağlı)
                </span>
              </label>
              {createAccount ? (
                <div className="kn-form-grid input-form--fields kn-checkout__account-fields">
                  <div className="form-group">
                    <label htmlFor="kn-checkout-pw">Şifre *</label>
                    <input
                      id="kn-checkout-pw"
                      className="form-control"
                      type="password"
                      required={createAccount}
                      minLength={6}
                      autoComplete="new-password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="kn-checkout-pw2">Şifre tekrar *</label>
                    <input
                      id="kn-checkout-pw2"
                      className="form-control"
                      type="password"
                      required={createAccount}
                      minLength={6}
                      autoComplete="new-password"
                      value={accountPassword2}
                      onChange={(e) => setAccountPassword2(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
          <section className="kn-checkout__section">
            <h2>Teslimat adresi</h2>
            {prefill && prefill.addresses.length > 0 ? (
              <div className="kn-address-pick">
                {prefill.addresses.map((a) => (
                  <label key={a.id} className="kn-address-pick__item">
                    <input
                      type="radio"
                      name="savedAddress"
                      checked={selectedAddressId === a.id}
                      onChange={() => {
                        setSelectedAddressId(a.id);
                        const f = addressToForm(a);
                        setForm((prev) => ({
                          ...prev,
                          ...f,
                          phone: f.phone || prev.phone,
                          firstName: f.firstName || prev.firstName,
                          lastName: f.lastName || prev.lastName,
                        }));
                      }}
                    />
                    <span>
                      <strong>{a.label || "Adres"}</strong>
                      {a.isDefault ? <em className="kn-address-pick__default"> varsayılan</em> : null}
                      <br />
                      {a.line1}, {a.district} / {a.city}
                    </span>
                  </label>
                ))}
                <label className="kn-address-pick__item">
                  <input
                    type="radio"
                    name="savedAddress"
                    checked={selectedAddressId === ""}
                    onChange={() => setSelectedAddressId("")}
                  />
                  <span>Yeni adres gir</span>
                </label>
              </div>
            ) : null}
            <div className="kn-form-grid input-form--fields">
              <div className="form-group">
                <label htmlFor="kn-checkout-first">Ad *</label>
                <input
                  id="kn-checkout-first"
                  className="form-control"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="kn-checkout-last">Soyad *</label>
                <input
                  id="kn-checkout-last"
                  className="form-control"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="kn-checkout-city">İl *</label>
                <input
                  id="kn-checkout-city"
                  className="form-control"
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="kn-checkout-district">İlçe *</label>
                <input
                  id="kn-checkout-district"
                  className="form-control"
                  required
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                />
              </div>
              <div className="form-group kn-form-full">
                <label htmlFor="kn-checkout-line">Adres *</label>
                <textarea
                  id="kn-checkout-line"
                  className="form-control"
                  required
                  rows={2}
                  value={form.line1}
                  onChange={(e) => setForm({ ...form, line1: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="kn-checkout-postal">Posta kodu</label>
                <input
                  id="kn-checkout-postal"
                  className="form-control"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                />
              </div>
            </div>
          </section>
          <section className="kn-checkout__section">
            <h2>Kargo</h2>
            {freeShipping ? (
              <p className="kn-text-success">Ücretsiz kargo uygulandı.</p>
            ) : shipping.length === 0 ? (
              <p className="kn-alert kn-alert--warn">Aktif kargo tarifesi yok. Admin → Kargo bölümünden ekleyin.</p>
            ) : (
              <div className="kn-shipping-options">
                {shipping.map((o) => (
                  <label key={`${o.carrierId}-${o.rateId}`} className="kn-shipping-option">
                    <input
                      type="radio"
                      name="shipping"
                      checked={carrierId === o.carrierId && rateId === o.rateId}
                      onChange={() => {
                        setCarrierId(o.carrierId);
                        setRateId(o.rateId);
                      }}
                    />
                    <span>
                      {o.carrierName} — {o.rateName}
                    </span>
                    <strong>{o.priceMinor === 0 ? "Ücretsiz" : formatTry(o.priceMinor)}</strong>
                  </label>
                ))}
              </div>
            )}
          </section>
          <section className="kn-checkout__section">
            <h2>Ödeme yöntemi</h2>
            <div className="kn-payment-options">
              {payment.codEnabled ? (
                <label>
                  <input
                    type="radio"
                    name="pay"
                    value="cod"
                    checked={form.paymentMethod === "cod"}
                    onChange={() => setForm({ ...form, paymentMethod: "cod" })}
                  />
                  Kapıda ödeme (nakit / kart)
                </label>
              ) : null}
              {payment.bankTransferEnabled ? (
                <label>
                  <input
                    type="radio"
                    name="pay"
                    value="bank_transfer"
                    checked={form.paymentMethod === "bank_transfer"}
                    onChange={() => setForm({ ...form, paymentMethod: "bank_transfer" })}
                  />
                  Havale / EFT
                </label>
              ) : null}
              {payment.cardEnabled ? (
                <label>
                  <input
                    type="radio"
                    name="pay"
                    value="card"
                    checked={form.paymentMethod === "card"}
                    onChange={() => setForm({ ...form, paymentMethod: "card" })}
                  />
                  Kredi / banka kartı (PayTR güvenli ödeme)
                </label>
              ) : (
                <label className="kn-payment-option--muted">
                  <input type="radio" name="pay" value="card" disabled />
                  Kredi kartı (PayTR ayarları admin panelde)
                </label>
              )}
            </div>
            {form.paymentMethod === "bank_transfer" && payment.bankAccounts.length > 0 ? (
              <div className="kn-bank-accounts">
                {payment.bankAccounts.map((b) => (
                  <p key={b.iban}>
                    <strong>{b.bank}</strong> — {b.holder}
                    <br />
                    IBAN: {b.iban}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
          <label className="kn-checkout__terms">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
            />
            <span>
              <Link href="/pages/mesafeli-satis" target="_blank" rel="noopener noreferrer">
                Mesafeli satış sözleşmesi
              </Link>
              ve ön bilgilendirme formunu okudum, kabul ediyorum.
            </span>
          </label>
        </div>
        <aside className="kn-checkout__summary">
          <h2>Sipariş özeti</h2>
          <ul className="kn-checkout__items">
            {cart.items.map((l) => (
              <li key={l.productId}>
                <span>
                  {l.title} × {l.qty}
                </span>
                <span>{formatTry(l.discountMinor > 0 ? l.lineTotalMinor : l.lineMinor)}</span>
              </li>
            ))}
          </ul>
          <div className="cart-summary-price-item">
            <span>Ara toplam</span>
            <span>{formatTry(cart.subtotalMinor)}</span>
          </div>
          {cart.discountMinor > 0 ? (
            <div className="cart-summary-price-item">
              <span>İndirim</span>
              <span>−{formatTry(cart.discountMinor)}</span>
            </div>
          ) : null}
          <div className="cart-summary-price-item">
            <span>Kargo</span>
            <span>{freeShipping || shipMinor === 0 ? "Ücretsiz" : formatTry(shipMinor)}</span>
          </div>
          <div className="cart-summary-price-item">
            <strong>Toplam</strong>
            <strong>{formatTry(grandTotal)}</strong>
          </div>
          {err ? <p className="kn-checkout__err">{err}</p> : null}
          <button type="submit" className="button medium-button button-block cart-checkout-btn" disabled={busy}>
            {busy ? "İşleniyor…" : "Siparişi tamamla"}
          </button>
        </aside>
      </div>
      </form>
    </div>
  );
}
