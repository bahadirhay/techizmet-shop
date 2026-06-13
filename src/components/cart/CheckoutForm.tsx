"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { TurkeyAddressFields } from "@/components/address/TurkeyAddressFields";
import { useCart } from "@/components/cart/CartContext";
import { formatPrice } from "@/lib/currency/format-price";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { ShippingOption, CartView } from "@/lib/cart/types";
import type { CheckoutPrefill } from "@/lib/checkout/prefill";
import {
  hasAnyCheckoutPaymentMethod,
  resolveDefaultPaymentMethod,
  type CheckoutPaymentFlags,
  type PaymentMethodId,
} from "@/lib/checkout/payment-options";
import { formatCheckoutLine1, splitSavedLine1 } from "@/lib/tr-address/format";
import { accountLoginPath } from "@/lib/account-return-path";
import { DistanceSalesAgreementCheckoutPreview } from "@/components/legal/DistanceSalesAgreementCheckoutPreview";
import type { LegalSellerProfile } from "@/lib/legal/seller-profile";

function addressToForm(a: CheckoutPrefill["addresses"][0]) {
  const { neighborhood, streetLine } = splitSavedLine1(a.line1);
  return {
    firstName: a.firstName ?? "",
    lastName: a.lastName ?? "",
    phone: a.phone ?? "",
    city: a.city,
    district: a.district,
    neighborhood,
    line1: streetLine,
    postalCode: a.postalCode ?? "",
  };
}

const EMPTY_ADDRESS = {
  city: "",
  district: "",
  neighborhood: "",
  line1: "",
  postalCode: "",
};

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
  initialShipping = [],
  initialFreeShipping = false,
  locale,
  usdRate,
  sellerProfile,
}: {
  payment: CheckoutPaymentFlags;
  prefill?: CheckoutPrefill | null;
  embed?: boolean;
  initialShipping?: ShippingOption[];
  initialFreeShipping?: boolean;
  locale?: ShopLocale;
  usdRate?: number | null;
  sellerProfile?: LegalSellerProfile;
}) {
  const router = useRouter();
  const { cart, refresh, loading: cartLoading, removeCoupon } = useCart();
  const [shipping, setShipping] = useState<ShippingOption[]>(initialShipping);
  const [freeShipping, setFreeShipping] = useState(initialFreeShipping);
  const [carrierId, setCarrierId] = useState("");
  const [rateId, setRateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createAccount, setCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPassword2, setAccountPassword2] = useState("");
  // Kupon
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponErr, setCouponErr] = useState<string | null>(null);

  const defaultAddr = prefill?.addresses.find((a) => a.isDefault) ?? prefill?.addresses[0];
  const addrFields = defaultAddr ? addressToForm(defaultAddr) : null;

  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddr?.id ?? "");
  const [saveAddress, setSaveAddress] = useState(
    Boolean(prefill?.loggedIn && !(prefill?.addresses.length)),
  );
  const defaultPay = resolveDefaultPaymentMethod(payment);
  const [form, setForm] = useState({
    email: prefill?.email ?? "",
    phone: prefill?.phone || addrFields?.phone || "",
    firstName: prefill?.firstName || addrFields?.firstName || "",
    lastName: prefill?.lastName || addrFields?.lastName || "",
    city: addrFields?.city ?? "",
    district: addrFields?.district ?? "",
    neighborhood: addrFields?.neighborhood ?? "",
    line1: addrFields?.line1 ?? "",
    postalCode: addrFields?.postalCode ?? "",
    paymentMethod: defaultPay ?? ("cod" as PaymentMethodId),
    acceptTerms: false,
  });

  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueAbandonmentTouch = useCallback((email: string, phone: string) => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      const e = email.trim();
      const p = phone.trim();
      if (!e && !p) return;
      fetch("/api/checkout/abandonment-touch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: e || undefined, phone: p || undefined }),
      }).catch(() => {});
    }, 600);
  }, []);

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  const paymentAvailable = hasAnyCheckoutPaymentMethod(payment);
  const fmt = (minor: number) => formatPrice(minor, locale ?? "tr", usdRate);
  const selectedShipping = shipping.find(
    (o) => o.carrierId === carrierId && o.rateId === rateId,
  );
  const shippingLabel = freeShipping
    ? "Ücretsiz kargo"
    : selectedShipping
      ? `${selectedShipping.carrierName} — ${selectedShipping.rateName}${
          selectedShipping.priceMinor === 0 ? "" : ` (${fmt(selectedShipping.priceMinor)})`
        }`
      : undefined;

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    setCouponErr(null);
    // Direkt fetch → cart.errors[0] ile geçersiz kupon mesajını yakalayabiliriz
    const res = await fetch("/api/cart/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      const j = (await res.json()) as { cart: CartView };
      const errMsg = j.cart.errors?.[0];
      if (errMsg) {
        setCouponErr(errMsg);
      } else {
        await refresh(); // CartContext'i senkronize et
        setCouponInput("");
        setCouponOpen(false);
      }
    } else {
      setCouponErr("Kupon uygulanamadı");
    }
    setCouponBusy(false);
  }

  async function handleRemoveCoupon() {
    setCouponBusy(true);
    await removeCoupon();
    setCouponBusy(false);
    setCouponErr(null);
  }

  const isNewAddress = !selectedAddressId;
  const showSaveAddressOption = Boolean(prefill?.loggedIn && isNewAddress);

  const patchAddress = useCallback((patch: Partial<typeof EMPTY_ADDRESS & { line1: string; postalCode: string }>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    refresh();
    // Sunucudan gelen initialShipping varsa ilk yüklemede fetch atlamak için flag
    const hasInitial = initialShipping.length > 0 || initialFreeShipping;
    if (hasInitial) {
      // initialShipping'den ilk seçeneği varsayılan yap
      if (initialShipping[0] && !carrierId) {
        setCarrierId(initialShipping[0].carrierId);
        setRateId(initialShipping[0].rateId);
      }
      return;
    }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [embed, cart, shipping, err, busy, createAccount, saveAddress, form]);

  function selectNewAddress() {
    setSelectedAddressId("");
    setSaveAddress(true);
    setForm((prev) => ({
      ...prev,
      ...EMPTY_ADDRESS,
    }));
  }

  function selectSavedAddress(a: CheckoutPrefill["addresses"][0]) {
    setSelectedAddressId(a.id);
    setSaveAddress(false);
    const f = addressToForm(a);
    setForm((prev) => ({
      ...prev,
      ...f,
      phone: f.phone || prev.phone,
      firstName: f.firstName || prev.firstName,
      lastName: f.lastName || prev.lastName,
    }));
  }

  const pageClass = embed ? "kn-checkout-page kn-checkout-page--embed" : "kn-checkout-page";
  const linkProps = embed ? { target: "_top" as const } : {};

  if (cartLoading) {
    return (
      <div className={pageClass}>
        {!embed ? (
          <header className="kn-checkout-page__banner">
            <h1>Ödeme</h1>
          </header>
        ) : null}
        <div className="kn-checkout kn-checkout--loading" aria-busy="true">
          <p>Sepet yükleniyor…</p>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className={pageClass}>
        {!embed ? (
          <header className="kn-checkout-page__banner">
            <h1>Ödeme</h1>
          </header>
        ) : null}
        <div className="kn-checkout kn-checkout--empty">
          <p>Sepetiniz boş.</p>
          <Link href="/collections/all" className="button medium-button button-block" {...linkProps}>
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
    if (!form.city || !form.district || !form.neighborhood || !form.line1.trim()) {
      setErr("İl, ilçe, mahalle ve adres (sokak) zorunludur");
      return;
    }
    if (!paymentAvailable) {
      setErr("Şu an aktif ödeme yöntemi yok. Lütfen mağaza yöneticisiyle iletişime geçin.");
      return;
    }
    if (
      (form.paymentMethod === "cod" && !payment.codEnabled) ||
      (form.paymentMethod === "bank_transfer" && !payment.bankTransferEnabled) ||
      (form.paymentMethod === "card" && !payment.cardEnabled)
    ) {
      setErr("Seçilen ödeme yöntemi kullanılamıyor. Lütfen başka bir yöntem seçin.");
      return;
    }
    setBusy(true);
    setErr(null);
    const fullLine1 = formatCheckoutLine1(form.neighborhood, form.line1);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        ...form,
        line1: fullLine1,
        carrierId: freeShipping ? shipping[0]?.carrierId ?? "" : carrierId,
        rateId: freeShipping ? shipping[0]?.rateId ?? "" : rateId,
        createAccount: !prefill?.loggedIn && createAccount,
        accountPassword: !prefill?.loggedIn && createAccount ? accountPassword : undefined,
        saveAddress: showSaveAddressOption && saveAddress,
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

  const authNotice = prefill?.loggedIn ? (
    <p>
      <Link href="/account" {...linkProps}>Hesabınız</Link> ile giriş yaptınız — kayıtlı adresinizi seçebilir veya yeni adres girebilirsiniz.
    </p>
  ) : (
    <p>
      Misafir olarak devam ediyorsunuz.{" "}
      <Link href={accountLoginPath("/checkout")} {...linkProps}>Üye girişi</Link> yaparak kayıtlı adreslerinizi kullanabilirsiniz — üye olmadan da sipariş verebilirsiniz.
    </p>
  );

  return (
    <div className={pageClass}>
      {!embed ? (
        <header className="kn-checkout-page__banner">
          <h1>Ödeme</h1>
          {authNotice}
        </header>
      ) : (
        <div className="kn-checkout-page__auth-bar" role="status">
          {authNotice}
        </div>
      )}
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
                  onChange={(e) => {
                    const email = e.target.value;
                    setForm({ ...form, email });
                    queueAbandonmentTouch(email, form.phone);
                  }}
                  onBlur={() => queueAbandonmentTouch(form.email, form.phone)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="kn-checkout-phone">Telefon *</label>
                <input
                  id="kn-checkout-phone"
                  className="form-control"
                  required
                  value={form.phone}
                  onChange={(e) => {
                    const phone = e.target.value;
                    setForm({ ...form, phone });
                    queueAbandonmentTouch(form.email, phone);
                  }}
                  onBlur={() => queueAbandonmentTouch(form.email, form.phone)}
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
                      onChange={() => selectSavedAddress(a)}
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
                    onChange={selectNewAddress}
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
              <TurkeyAddressFields
                idPrefix="kn-checkout"
                value={{
                  city: form.city,
                  district: form.district,
                  neighborhood: form.neighborhood,
                  postalCode: form.postalCode,
                  line1: form.line1,
                }}
                onChange={patchAddress}
              />
            </div>
            {showSaveAddressOption ? (
              <label className="kn-checkout__account-toggle kn-checkout__save-address">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                />
                <span>Bu adresi hesabıma kaydet</span>
              </label>
            ) : null}
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
                    <strong>{o.priceMinor === 0 ? "Ücretsiz" : fmt(o.priceMinor)}</strong>
                  </label>
                ))}
              </div>
            )}
          </section>
          <section className="kn-checkout__section">
            <h2>Ödeme yöntemi</h2>
            {payment.paytrTestMode ? (
              <p className="kn-paytr-test-notice" role="status">
                PayTR test modu aktif — gerçek tahsilat yapılmaz; PayTR panelindeki test kartlarını kullanın.
              </p>
            ) : null}
            {!paymentAvailable ? (
              <p className="kn-alert kn-alert--warn">
                Aktif ödeme yöntemi tanımlı değil. Admin → Entegrasyon → Ödeme bölümünden en az bir yöntemi
                açın.
              </p>
            ) : (
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
                  Kredi / banka kartı (PayTR{payment.paytrTestMode ? " · test" : ""} güvenli ödeme)
                </label>
              ) : null}
            </div>
            )}
            {payment.cardEnabled && form.paymentMethod === "card" ? (
              <p className="kn-checkout__card-hint">
                Kart numarası bu adımda istenmez. Siparişi tamamladıktan sonra güvenli PayTR ödeme
                ekranında kart bilgilerinizi gireceksiniz.
              </p>
            ) : null}
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
          {sellerProfile ? (
            <DistanceSalesAgreementCheckoutPreview
              seller={sellerProfile}
              form={form}
              cart={cart}
              shippingLabel={shippingLabel}
              locale={locale}
              usdRate={usdRate}
            />
          ) : null}
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
                <span>{fmt(l.discountMinor > 0 ? l.lineTotalMinor : l.lineMinor)}</span>
              </li>
            ))}
          </ul>
          <div className="cart-summary-price-item">
            <span>Ara toplam</span>
            <span>{fmt(cart.subtotalMinor)}</span>
          </div>
          {cart.discountMinor > 0 ? (
            <div className="cart-summary-price-item kn-checkout__discount-row">
              <span>
                İndirim
                {cart.couponCode ? (
                  <em className="kn-checkout__coupon-badge"> · {cart.couponCode}</em>
                ) : null}
              </span>
              <span>−{fmt(cart.discountMinor)}</span>
            </div>
          ) : null}

          {/* Kupon alanı */}
          {cart.couponCode ? (
            <div className="kn-checkout__coupon-applied">
              <span>🎫 <strong>{cart.couponCode}</strong> uygulandı</span>
              <button
                type="button"
                className="kn-checkout__coupon-remove"
                onClick={handleRemoveCoupon}
                disabled={couponBusy}
              >
                Kaldır
              </button>
            </div>
          ) : couponOpen ? (
            <div className="kn-checkout__coupon-form">
              <input
                className="form-control kn-checkout__coupon-input"
                placeholder="Kupon kodu"
                value={couponInput}
                onChange={(e) => { setCouponInput(e.target.value); setCouponErr(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleApplyCoupon(); } }}
                autoFocus
                autoCapitalize="characters"
              />
              <button
                type="button"
                className="button small-button kn-checkout__coupon-btn"
                disabled={couponBusy || !couponInput.trim()}
                onClick={() => void handleApplyCoupon()}
              >
                {couponBusy ? "…" : "Uygula"}
              </button>
              <button
                type="button"
                className="kn-checkout__coupon-cancel"
                onClick={() => { setCouponOpen(false); setCouponInput(""); setCouponErr(null); }}
              >
                İptal
              </button>
              {couponErr ? <p className="kn-checkout__coupon-err">{couponErr}</p> : null}
            </div>
          ) : (
            <button
              type="button"
              className="kn-checkout__coupon-toggle"
              onClick={() => setCouponOpen(true)}
            >
              + Kupon kodum var
            </button>
          )}

          <div className="cart-summary-price-item">
            <span>Kargo</span>
            <span>{freeShipping || shipMinor === 0 ? "Ücretsiz" : fmt(shipMinor)}</span>
          </div>
          <div className="cart-summary-price-item">
            <strong>Toplam</strong>
            <strong>{fmt(grandTotal)}</strong>
          </div>
          {err ? <p className="kn-checkout__err">{err}</p> : null}
          <button
            type="submit"
            className="button medium-button button-block cart-checkout-btn kn-checkout__submit-btn"
            disabled={busy || !paymentAvailable}
          >
            {busy ? "İşleniyor…" : "Siparişi tamamla"}
          </button>
        </aside>
      </div>
      </form>
    </div>
  );
}
