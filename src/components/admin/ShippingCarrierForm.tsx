"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { minorToTry } from "@/lib/admin/money";

export type CarrierFormData = {
  id?: string;
  code: string;
  name: string;
  active: boolean;
  trackingUrlTemplate: string;
  customerServicePhone: string;
  notes: string;
  apiUsername: string;
  apiPassword: string;
  apiCustomerCode: string;
  contractNo: string;
  sortOrder: string;
};

export type RateRow = {
  id?: string;
  name: string;
  price: string;
  freeOver: string;
  minDesi: string;
  maxDesi: string;
};

export function ShippingCarrierForm({
  initial,
  initialRates,
}: {
  initial: CarrierFormData;
  initialRates: RateRow[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [rates, setRates] = useState(initialRates);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function saveCarrier() {
    setBusy(true);
    setErr(null);
    const config = {
      apiUsername: form.apiUsername,
      apiPassword: form.apiPassword,
      apiCustomerCode: form.apiCustomerCode,
      contractNo: form.contractNo,
    };
    const payload = {
      code: form.code,
      name: form.name,
      active: form.active,
      trackingUrlTemplate: form.trackingUrlTemplate,
      customerServicePhone: form.customerServicePhone,
      notes: form.notes,
      config,
      sortOrder: form.sortOrder,
    };
    const url = form.id
      ? `/api/admin/shipping/carriers/${form.id}`
      : "/api/admin/shipping/carriers";
    const res = await fetch(url, {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { error?: string; carrier?: { id: string } };
    if (!res.ok) {
      setBusy(false);
      setErr(json.error ?? "Kayıt başarısız");
      return;
    }
    const carrierId = form.id ?? json.carrier?.id;
    if (carrierId && rates.length) {
      for (const r of rates.filter((x) => !x.id && x.name.trim())) {
        await fetch(`/api/admin/shipping/carriers/${carrierId}/rates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(r),
        });
      }
    }
    setBusy(false);
    router.push("/admin/shipping");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{form.id ? "Kargo firması" : "Yeni kargo firması"}</h1>
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Kod *" hint="yurtici, aras, mng">
            <input
              className={inputClass}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </AdminField>
          <AdminField label="Firma adı *">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </AdminField>
        </div>
        <AdminField label="Takip URL şablonu" hint="{tracking} yer tutucu">
          <input
            className={inputClass}
            value={form.trackingUrlTemplate}
            onChange={(e) => setForm({ ...form, trackingUrlTemplate: e.target.value })}
          />
        </AdminField>
        <AdminField label="Müşteri hizmetleri telefon">
          <input
            className={inputClass}
            value={form.customerServicePhone}
            onChange={(e) => setForm({ ...form, customerServicePhone: e.target.value })}
          />
        </AdminField>
        <h2 className="text-sm font-semibold text-zinc-800">API / sözleşme bilgileri</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="API kullanıcı adı">
            <input
              className={inputClass}
              value={form.apiUsername}
              onChange={(e) => setForm({ ...form, apiUsername: e.target.value })}
            />
          </AdminField>
          <AdminField label="API şifre / anahtar">
            <input
              className={inputClass}
              type="password"
              value={form.apiPassword}
              onChange={(e) => setForm({ ...form, apiPassword: e.target.value })}
            />
          </AdminField>
          <AdminField label="Müşteri / gönderici kodu">
            <input
              className={inputClass}
              value={form.apiCustomerCode}
              onChange={(e) => setForm({ ...form, apiCustomerCode: e.target.value })}
            />
          </AdminField>
          <AdminField label="Sözleşme no">
            <input
              className={inputClass}
              value={form.contractNo}
              onChange={(e) => setForm({ ...form, contractNo: e.target.value })}
            />
          </AdminField>
        </div>
        <AdminField label="Notlar">
          <textarea
            className={inputClass}
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </AdminField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Aktif
        </label>

        <h2 className="pt-4 text-sm font-semibold text-zinc-800">Kargo tarifeleri</h2>
        {rates.map((r, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-zinc-100 p-3 sm:grid-cols-4">
            <input
              className={inputClass}
              placeholder="Tarife adı"
              value={r.name}
              onChange={(e) => {
                const n = [...rates];
                n[i] = { ...n[i], name: e.target.value };
                setRates(n);
              }}
            />
            <input
              className={inputClass}
              placeholder="Ücret TL"
              value={r.price}
              onChange={(e) => {
                const n = [...rates];
                n[i] = { ...n[i], price: e.target.value };
                setRates(n);
              }}
            />
            <input
              className={inputClass}
              placeholder="Ücretsiz üstü TL"
              value={r.freeOver}
              onChange={(e) => {
                const n = [...rates];
                n[i] = { ...n[i], freeOver: e.target.value };
                setRates(n);
              }}
            />
            <input
              className={inputClass}
              placeholder="Max desi"
              value={r.maxDesi}
              onChange={(e) => {
                const n = [...rates];
                n[i] = { ...n[i], maxDesi: e.target.value };
                setRates(n);
              }}
            />
          </div>
        ))}
        <button
          type="button"
          className={btnSecondary}
          onClick={() => setRates([...rates, { name: "", price: "", freeOver: "", minDesi: "", maxDesi: "" }])}
        >
          + Tarife ekle
        </button>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="flex gap-2">
        <button type="button" className={btnPrimary} disabled={busy} onClick={saveCarrier}>
          Kaydet
        </button>
        <button type="button" className={btnSecondary} onClick={() => router.back()}>
          İptal
        </button>
      </div>
    </div>
  );
}

export function carrierToForm(
  c: {
    id: string;
    code: string;
    name: string;
    active: boolean;
    trackingUrlTemplate: string | null;
    customerServicePhone: string | null;
    notes: string | null;
    configJson: string | null;
    sortOrder: number;
  },
  rates: { id: string; name: string; priceMinor: number; freeOverMinor: number | null; minDesi: number | null; maxDesi: number | null }[],
): { form: CarrierFormData; rates: RateRow[] } {
  let cfg: Record<string, string> = {};
  try {
    if (c.configJson) cfg = JSON.parse(c.configJson) as Record<string, string>;
  } catch {
    /* */
  }
  return {
    form: {
      id: c.id,
      code: c.code,
      name: c.name,
      active: c.active,
      trackingUrlTemplate: c.trackingUrlTemplate ?? "",
      customerServicePhone: c.customerServicePhone ?? "",
      notes: c.notes ?? "",
      apiUsername: cfg.apiUsername ?? "",
      apiPassword: cfg.apiPassword ?? "",
      apiCustomerCode: cfg.apiCustomerCode ?? "",
      contractNo: cfg.contractNo ?? "",
      sortOrder: String(c.sortOrder),
    },
    rates: rates.map((r) => ({
      id: r.id,
      name: r.name,
      price: minorToTry(r.priceMinor),
      freeOver: r.freeOverMinor ? minorToTry(r.freeOverMinor) : "",
      minDesi: r.minDesi != null ? String(r.minDesi) : "",
      maxDesi: r.maxDesi != null ? String(r.maxDesi) : "",
    })),
  };
}
