"use client";

import { TurkeyAddressFields } from "@/components/address/TurkeyAddressFields";
import { AccountChangePasswordForm } from "@/components/store/AccountChangePasswordForm";
import { formatCheckoutLine1, splitSavedLine1 } from "@/lib/tr-address/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountLogoutButton } from "@/components/store/AccountLogoutButton";
import { formatTry } from "@/lib/format";

type Address = {
  id: string;
  label: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  city: string;
  district: string;
  line1: string;
  postalCode: string | null;
  isDefault: boolean;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  paymentStatusLabel: string;
  paymentMethodLabel: string;
  createdAt: string;
  trackingNumber: string | null;
  carrierName: string | null;
  totalMinor: number;
  canCancel: boolean;
  canRefund: boolean;
};

type FavoriteItem = {
  productId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  priceMinor: number;
};

type AccountTab = "profile" | "orders" | "addresses" | "favorites" | "password";

const ACCOUNT_TABS: { id: AccountTab; label: string }[] = [
  { id: "profile", label: "Profil" },
  { id: "orders", label: "Siparişlerim" },
  { id: "addresses", label: "Adres Bilgilerim" },
  { id: "favorites", label: "Favorilerim" },
  { id: "password", label: "Şifre Değiştir" },
];

export function AccountDashboard({
  name,
  email,
  memberGroup,
  initialProfile,
  initialAddresses,
  initialOrders,
  initialFavorites = [],
}: {
  name: string;
  email: string | null;
  memberGroup?: { name: string; discountPercent: number } | null;
  initialProfile: { firstName: string | null; lastName: string | null; phone: string | null };
  initialAddresses: Address[];
  initialOrders: OrderRow[];
  initialFavorites?: FavoriteItem[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");
  const [profile, setProfile] = useState(initialProfile);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [orders, setOrders] = useState(initialOrders);
  const [favorites, setFavorites] = useState(initialFavorites);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState({
    label: "Ev",
    city: "",
    district: "",
    neighborhood: "",
    line1: "",
    postalCode: "",
    isDefault: addresses.length === 0,
  });
  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || name;
  const [busy, setBusy] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    label: "",
    city: "",
    district: "",
    neighborhood: "",
    line1: "",
    postalCode: "",
    isDefault: false,
  });

  async function saveProfile() {
    setBusy(true);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setBusy(false);
    setProfileMsg(res.ok ? "Profil kaydedildi" : "Kayıt başarısız");
  }

  async function addAddress(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...addrForm,
        line1: formatCheckoutLine1(addrForm.neighborhood, addrForm.line1),
      }),
    });
    const json = (await res.json()) as { address?: Address; error?: string };
    setBusy(false);
    if (!res.ok) {
      alert(json.error ?? "Adres eklenemedi");
      return;
    }
    if (json.address) {
      setAddresses((prev) => {
        const next = json.address!.isDefault
          ? prev.map((a) => ({ ...a, isDefault: false }))
          : [...prev];
        return [json.address!, ...next];
      });
      setAddrForm({
        label: "Ev",
        city: "",
        district: "",
        neighborhood: "",
        line1: "",
        postalCode: "",
        isDefault: false,
      });
    }
    router.refresh();
  }

  async function setDefaultAddress(id: string) {
    await fetch(`/api/account/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
  }

  async function deleteAddress(id: string) {
    if (!confirm("Bu adresi silmek istiyor musunuz?")) return;
    const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      alert(json.error ?? "Adres silinemedi");
      return;
    }
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    if (editingAddressId === id) setEditingAddressId(null);
    router.refresh();
  }

  function startEditAddress(a: Address) {
    const { neighborhood, streetLine } = splitSavedLine1(a.line1);
    setEditingAddressId(a.id);
    setEditForm({
      label: a.label ?? "",
      city: a.city,
      district: a.district,
      neighborhood,
      line1: streetLine,
      postalCode: a.postalCode ?? "",
      isDefault: a.isDefault,
    });
  }

  async function saveAddressEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAddressId) return;
    setBusy(true);
    const res = await fetch(`/api/account/addresses/${editingAddressId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        line1: formatCheckoutLine1(editForm.neighborhood, editForm.line1),
      }),
    });
    const json = (await res.json()) as { address?: Address; error?: string };
    setBusy(false);
    if (!res.ok) {
      alert(json.error ?? "Adres güncellenemedi");
      return;
    }
    if (json.address) {
      setAddresses((prev) => {
        const next = prev.map((a) =>
          a.id === editingAddressId
            ? json.address!
            : editForm.isDefault
              ? { ...a, isDefault: false }
              : a,
        );
        return next;
      });
    }
    setEditingAddressId(null);
    router.refresh();
  }

  async function orderRequest(orderNumber: string, type: "cancel" | "refund") {
    const reason = prompt(type === "cancel" ? "İptal nedeni (isteğe bağlı):" : "İade nedeni (isteğe bağlı):");
    if (reason === null) return;
    const res = await fetch(`/api/account/orders/${encodeURIComponent(orderNumber)}/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, reason }),
    });
    const json = (await res.json()) as { error?: string; message?: string; status?: string };
    if (!res.ok) {
      alert(json.error ?? "İşlem başarısız");
      return;
    }
    alert(json.message ?? "Talep alındı");
    setOrders((prev) =>
      prev.map((o) =>
        o.orderNumber === orderNumber
          ? {
              ...o,
              status: json.status ?? o.status,
              statusLabel:
                json.status === "cancelled"
                  ? "İptal"
                  : json.status === "refund_requested"
                    ? "İade talebi"
                    : o.statusLabel,
              canCancel: false,
              canRefund: false,
            }
          : o,
      ),
    );
    router.refresh();
  }

  async function removeFavorite(productId: string) {
    const res = await fetch("/api/account/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (!res.ok) {
      alert("İşlem başarısız");
      return;
    }
    setFavorites((prev) => prev.filter((f) => f.productId !== productId));
  }

  return (
    <div className="kn-account kn-account--wide">
      <div className="kn-account__head">
        <div>
          <h1>Hesabım</h1>
          <p className="kn-account__lead">
            Hoş geldiniz, <strong>{displayName}</strong>
            {email ? <span className="kn-account__email"> · {email}</span> : null}
          </p>
          {memberGroup ? (
            <p className="kn-account__group">
              Üye grubunuz: <strong>{memberGroup.name}</strong> — alışverişlerinizde satış fiyatı
              üzerinden <strong>%{memberGroup.discountPercent}</strong> indirim uygulanır.
            </p>
          ) : null}
        </div>
        <AccountLogoutButton />
      </div>
      <nav className="kn-account-nav kn-account-nav--tabs" aria-label="Hesap menüsü">
        {ACCOUNT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`kn-account-nav__tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab(tab.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "profile" ? (
      <section className="kn-account-section">
        <h2>Profil</h2>
        <div className="kn-account__form kn-form-grid-2">
          <label>
            Ad
            <input
              value={profile.firstName ?? ""}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
            />
          </label>
          <label>
            Soyad
            <input
              value={profile.lastName ?? ""}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
            />
          </label>
          <label>
            Telefon
            <input
              value={profile.phone ?? ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </label>
        </div>
        {profileMsg ? <p className="kn-text-success">{profileMsg}</p> : null}
        <button type="button" className="kn-btn kn-btn--primary" onClick={saveProfile} disabled={busy}>
          Profili kaydet
        </button>
      </section>
      ) : null}

      {activeTab === "password" ? (
      <section className="kn-account-section">
        <AccountChangePasswordForm />
      </section>
      ) : null}

      {activeTab === "addresses" ? (
      <section className="kn-account-section">
        <h2>Adres bilgilerim</h2>
        <ul className="kn-address-list">
          {addresses.map((a) => (
            <li key={a.id} className="kn-address-card">
              {editingAddressId === a.id ? (
                <form className="kn-account__form kn-address-edit" onSubmit={saveAddressEdit}>
                  <h3>Adresi düzenle</h3>
                  <label>
                    Etiket
                    <input
                      value={editForm.label}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                    />
                  </label>
                  <TurkeyAddressFields
                    idPrefix="kn-edit-addr"
                    value={{
                      city: editForm.city,
                      district: editForm.district,
                      neighborhood: editForm.neighborhood,
                      postalCode: editForm.postalCode,
                      line1: editForm.line1,
                    }}
                    onChange={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
                    disabled={busy}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.isDefault}
                      onChange={(e) => setEditForm({ ...editForm, isDefault: e.target.checked })}
                    />
                    Varsayılan adres
                  </label>
                  <div className="kn-address-card__actions">
                    <button type="submit" className="kn-btn kn-btn--primary kn-btn--sm" disabled={busy}>
                      Kaydet
                    </button>
                    <button
                      type="button"
                      className="kn-btn kn-btn--outline kn-btn--sm"
                      onClick={() => setEditingAddressId(null)}
                    >
                      İptal
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    {a.isDefault ? <span className="kn-badge">Varsayılan</span> : null}
                    <strong>{a.label ?? "Adres"}</strong>
                    <p>
                      {a.line1}, {a.district} / {a.city}
                    </p>
                  </div>
                  <div className="kn-address-card__actions">
                    <button type="button" className="kn-btn kn-btn--outline kn-btn--sm" onClick={() => startEditAddress(a)}>
                      Düzenle
                    </button>
                    {!a.isDefault ? (
                      <button type="button" className="kn-btn kn-btn--outline kn-btn--sm" onClick={() => setDefaultAddress(a.id)}>
                        Varsayılan yap
                      </button>
                    ) : null}
                    <button type="button" className="kn-btn kn-btn--outline kn-btn--sm" onClick={() => deleteAddress(a.id)}>
                      Sil
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
        <form className="kn-account__form kn-address-add" onSubmit={addAddress}>
          <h3>Yeni adres</h3>
          <label>
            Etiket
            <input value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} />
          </label>
          <TurkeyAddressFields
            idPrefix="kn-new-addr"
            value={{
              city: addrForm.city,
              district: addrForm.district,
              neighborhood: addrForm.neighborhood,
              postalCode: addrForm.postalCode,
              line1: addrForm.line1,
            }}
            onChange={(patch) => setAddrForm((prev) => ({ ...prev, ...patch }))}
            disabled={busy}
          />
          <label>
            <input
              type="checkbox"
              checked={addrForm.isDefault}
              onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })}
            />
            Varsayılan adres
          </label>
          <button type="submit" className="kn-btn kn-btn--outline" disabled={busy}>
            Adres ekle
          </button>
        </form>
      </section>
      ) : null}

      {activeTab === "orders" ? (
      <section className="kn-account-section">
        <h2>Siparişlerim</h2>
        {orders.length === 0 ? (
          <p className="kn-account__lead">Henüz sipariş yok.</p>
        ) : (
          <ul className="kn-account-orders">
            {orders.map((o) => (
              <li key={o.id} className="kn-account-order">
                <div className="kn-account-order__main">
                  <Link href={`/orders/track?order=${encodeURIComponent(o.orderNumber)}`}>
                    <strong>{o.orderNumber}</strong>
                  </Link>
                  <span className="kn-account-order__date">
                    {new Date(o.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <p className="kn-account-order__meta">
                  {o.statusLabel} · {o.paymentStatusLabel} · {o.paymentMethodLabel}
                </p>
                {o.trackingNumber ? (
                  <p className="kn-account-order__track">
                    {o.carrierName}: {o.trackingNumber}
                  </p>
                ) : null}
                <p className="kn-account-order__total">{formatTry(o.totalMinor)}</p>
                <div className="kn-account-order__actions">
                  {o.canCancel ? (
                    <button
                      type="button"
                      className="kn-btn kn-btn--outline kn-btn--sm"
                      onClick={() => orderRequest(o.orderNumber, "cancel")}
                    >
                      Siparişi iptal et
                    </button>
                  ) : null}
                  {o.canRefund ? (
                    <button
                      type="button"
                      className="kn-btn kn-btn--outline kn-btn--sm"
                      onClick={() => orderRequest(o.orderNumber, "refund")}
                    >
                      İade talebi
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      ) : null}

      {activeTab === "favorites" ? (
      <section className="kn-account-section">
        <h2>Favorilerim</h2>
        {favorites.length === 0 ? (
          <p className="kn-muted">Henüz favori ürününüz yok.</p>
        ) : (
          <ul className="kn-fav-list">
            {favorites.map((item) => (
              <li key={item.productId} className="kn-fav-list__item">
                <Link href={`/products/${item.slug}`} className="kn-fav-list__link">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="kn-fav-list__img" width={64} height={64} />
                  ) : null}
                  <span>
                    <strong>{item.title}</strong>
                    <span className="kn-fav-list__price">{formatTry(item.priceMinor)}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="kn-btn kn-btn--outline kn-btn--sm"
                  onClick={() => removeFavorite(item.productId)}
                >
                  Kaldır
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      ) : null}

      <p className="kn-account__footer">
        <Link href="/orders/track">Misafir sipariş takip</Link> ·{" "}
        <Link href="/collections/all">Alışverişe devam</Link>
      </p>
    </div>
  );
}
