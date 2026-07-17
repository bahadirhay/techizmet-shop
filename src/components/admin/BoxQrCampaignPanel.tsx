"use client";

import { useEffect, useState } from "react";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";
import { DEFAULT_BOX_QR } from "@/lib/box-qr/types";

type FormState = {
  enabled: boolean;
  discountPercent: string;
  validityDays: string;
  firstOrderOnly: boolean;
  minCartTry: string;
  headlineTr: string;
  subheadTr: string;
  bodyTr: string;
  ctaTr: string;
  successTr: string;
  legalTr: string;
};

type Stats = { grants: number; redeemed: number; active: number };

const empty: FormState = {
  enabled: true,
  discountPercent: String(DEFAULT_BOX_QR.discountPercent),
  validityDays: String(DEFAULT_BOX_QR.validityDays),
  firstOrderOnly: true,
  minCartTry: "",
  headlineTr: DEFAULT_BOX_QR.headlineTr,
  subheadTr: DEFAULT_BOX_QR.subheadTr,
  bodyTr: DEFAULT_BOX_QR.bodyTr,
  ctaTr: DEFAULT_BOX_QR.ctaTr,
  successTr: DEFAULT_BOX_QR.successTr,
  legalTr: DEFAULT_BOX_QR.legalTr,
};

export function BoxQrCampaignPanel() {
  const [form, setForm] = useState<FormState>(empty);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch("/api/admin/marketing/box-qr");
      const json = (await res.json()) as {
        settings?: Partial<FormState> & {
          discountPercent?: number;
          validityDays?: number;
          minCartTry?: number;
        };
        stats?: Stats;
        error?: string;
      };
      if (res.ok && json.settings) {
        const s = json.settings;
        setForm({
          enabled: s.enabled !== false,
          discountPercent: String(s.discountPercent ?? DEFAULT_BOX_QR.discountPercent),
          validityDays: String(s.validityDays ?? DEFAULT_BOX_QR.validityDays),
          firstOrderOnly: s.firstOrderOnly !== false,
          minCartTry: s.minCartTry ? String(s.minCartTry) : "",
          headlineTr: s.headlineTr || DEFAULT_BOX_QR.headlineTr,
          subheadTr: s.subheadTr || DEFAULT_BOX_QR.subheadTr,
          bodyTr: s.bodyTr || DEFAULT_BOX_QR.bodyTr,
          ctaTr: s.ctaTr || DEFAULT_BOX_QR.ctaTr,
          successTr: s.successTr || DEFAULT_BOX_QR.successTr,
          legalTr: s.legalTr || DEFAULT_BOX_QR.legalTr,
        });
        setStats(json.stats ?? null);
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/marketing/box-qr", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: form.enabled,
        discountPercent: Number(form.discountPercent),
        validityDays: Number(form.validityDays),
        firstOrderOnly: form.firstOrderOnly,
        minCartTry: form.minCartTry ? Number(form.minCartTry) : 0,
        headlineTr: form.headlineTr,
        subheadTr: form.subheadTr,
        bodyTr: form.bodyTr,
        ctaTr: form.ctaTr,
        successTr: form.successTr,
        legalTr: form.legalTr,
      }),
    });
    setSaving(false);
    setMsg(res.ok ? "Kaydedildi. /box sayfası güncellendi." : "Kayıt başarısız");
  }

  if (loading) return <p className="text-sm text-zinc-500">Yükleniyor…</p>;

  return (
    <div className="space-y-6">
      <section className="admin-card admin-card-pad space-y-4">
        <div>
          <h2 className="font-semibold">Paket QR kampanyası (/box)</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Kutudaki QR → <code className="text-xs">anatolianpaw.com/box</code>. Üye olan müşteriye
            kişisel, süreli indirim kodu otomatik yüklenir ve sepete uygulanır.
          </p>
        </div>

        {stats ? (
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded border bg-zinc-50 px-3 py-2">
              <div className="text-zinc-500">Toplam ödül</div>
              <div className="text-lg font-semibold">{stats.grants}</div>
            </div>
            <div className="rounded border bg-zinc-50 px-3 py-2">
              <div className="text-zinc-500">Aktif (süresi dolmamış)</div>
              <div className="text-lg font-semibold">{stats.active}</div>
            </div>
            <div className="rounded border bg-zinc-50 px-3 py-2">
              <div className="text-zinc-500">Kullanılmış kupon</div>
              <div className="text-lg font-semibold">{stats.redeemed}</div>
            </div>
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          Kampanya açık (/box yayınlanır)
        </label>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminField label="İndirim (%)">
            <input
              className={inputClass}
              type="number"
              min={1}
              max={50}
              value={form.discountPercent}
              onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
            />
          </AdminField>
          <AdminField label="Geçerlilik (gün)" hint="Kayıt anından itibaren">
            <input
              className={inputClass}
              type="number"
              min={1}
              max={365}
              value={form.validityDays}
              onChange={(e) => setForm({ ...form, validityDays: e.target.value })}
            />
          </AdminField>
          <AdminField label="Min. sepet (TL)" hint="Boş = yok">
            <input
              className={inputClass}
              type="number"
              min={0}
              step={1}
              value={form.minCartTry}
              onChange={(e) => setForm({ ...form, minCartTry: e.target.value })}
            />
          </AdminField>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={form.firstOrderOnly}
              onChange={(e) => setForm({ ...form, firstOrderOnly: e.target.checked })}
            />
            Yalnızca ilk sipariş
          </label>
        </div>

        <AdminField label="Başlık">
          <input
            className={inputClass}
            value={form.headlineTr}
            onChange={(e) => setForm({ ...form, headlineTr: e.target.value })}
          />
        </AdminField>
        <AdminField label="Alt başlık">
          <input
            className={inputClass}
            value={form.subheadTr}
            onChange={(e) => setForm({ ...form, subheadTr: e.target.value })}
          />
        </AdminField>
        <AdminField label="Açıklama">
          <textarea
            className={inputClass}
            rows={3}
            value={form.bodyTr}
            onChange={(e) => setForm({ ...form, bodyTr: e.target.value })}
          />
        </AdminField>
        <AdminField label="CTA buton metni">
          <input
            className={inputClass}
            value={form.ctaTr}
            onChange={(e) => setForm({ ...form, ctaTr: e.target.value })}
          />
        </AdminField>
        <AdminField label="Başarı mesajı">
          <textarea
            className={inputClass}
            rows={2}
            value={form.successTr}
            onChange={(e) => setForm({ ...form, successTr: e.target.value })}
          />
        </AdminField>
        <AdminField label="Yasal / küçük yazı">
          <textarea
            className={inputClass}
            rows={2}
            value={form.legalTr}
            onChange={(e) => setForm({ ...form, legalTr: e.target.value })}
          />
        </AdminField>

        {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
        <button type="button" className={btnPrimary} disabled={saving} onClick={() => void save()}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </section>
    </div>
  );
}
