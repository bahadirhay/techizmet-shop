"use client";

import { AccountChangePasswordForm } from "@/components/store/AccountChangePasswordForm";
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

export function AccountDashboard({
  name,
  email,
  memberGroup,
  initialProfile,
  initialAddresses,
  initialOrders,
}: {
  name: string;
  email: string | null;
  memberGroup?: { name: string; discountPercent: number } | null;
  initialProfile: { firstName: string | null; lastName: string | null; phone: string | null };
  initialAddresses: Address[];
  initialOrders: OrderRow[];
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [orders, setOrders] = useState(initialOrders);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState({
    label: "Ev",
    city: "",
    district: "",
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
      body: JSON.stringify(addrForm),
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
      setAddrForm({ label: "Ev", city: "", district: "", line1: "", postalCode: "", isDefault: false });
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
    setEditingAddressId(a.id);
    setEditForm({
      label: a.label ?? "",
      city: a.city,
      district: a.district,
      line1: a.line1,
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
      body: JSON.stringify(editForm),
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
      <nav className="kn-account-nav">
        <Link href="/account/favorites">Favorilerim</Link>
        <Link href="/orders/track">Sipariş takip</Link>
      </nav>

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

      <section className="kn-account-section">
        <AccountChangePasswordForm />
      </section>

      <section className="kn-account-section">
        <h2>Adres defteri</h2>
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
                  <label>
                    İl *
                    <input
                      required
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    />
                  </label>
                  <label>
                    İlçe *
                    <input
                      required
                      value={editForm.district}
                      onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    />
                  </label>
                  <label className="kn-form-full">
                    Adres *
                    <input
                      required
                      value={editForm.line1}
                      onChange={(e) => setEditForm({ ...editForm, line1: e.target.value })}
                    />
                  </label>
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
          <label>
            İl *
            <input required value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} />
          </label>
          <label>
            İlçe *
            <input
              required
              value={addrForm.district}
              onChange={(e) => setAddrForm({ ...addrForm, district: e.target.value })}
            />
          </label>
          <label className="kn-form-full">
            Adres *
            <input required value={addrForm.line1} onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })} />
          </label>
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

      <p className="kn-account__footer">
        <Link href="/orders/track">Misafir sipariş takip</Link> ·{" "}
        <Link href="/collections/all">Alışverişe devam</Link>
      </p>
    </div>
  );
}
