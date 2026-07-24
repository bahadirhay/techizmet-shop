"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { buildCarrierConfigPayload } from "@/lib/admin/shipping-form";
import type { ShippingProvider } from "@/lib/shipping/carrier-config";

export type CarrierFormData = {
  id?: string;
  code: string;
  name: string;
  active: boolean;
  trackingUrlTemplate: string;
  customerServicePhone: string;
  notes: string;
  provider: ShippingProvider;
  apiUsername: string;
  apiPassword: string;
  apiCustomerCode: string;
  abbreviationCode: string;
  companyName: string;
  companyAddressId: string;
  currentXDockCode: string;
  contractNo: string;
  testMode: boolean;
  productCode: string;
  deliveryType: string;
  autoMarkShipped: boolean;
  passwordConfigured: boolean;
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
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [passwordDirty, setPasswordDirty] = useState(false);

  async function saveCarrier(): Promise<string | null> {
    setBusy(true);
    setErr(null);
    try {
      const config = buildCarrierConfigPayload({
        ...form,
        apiUsername: form.apiUsername.trim(),
        apiPassword:
          passwordDirty || !form.passwordConfigured ? form.apiPassword.trim() : "",
        abbreviationCode: form.abbreviationCode.trim(),
        companyName: form.companyName.trim(),
        companyAddressId: form.companyAddressId.trim(),
        currentXDockCode: form.currentXDockCode.trim(),
      });
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
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
      const raw = await res.text();
      let json: { error?: string; carrier?: { id: string } } = {};
      if (raw.trim()) {
        try {
          json = JSON.parse(raw) as typeof json;
        } catch {
          setErr(`Kayıt başarısız (HTTP ${res.status})`);
          return null;
        }
      }
      if (!res.ok) {
        setErr(json.error ?? `Kayıt başarısız (HTTP ${res.status})`);
        return null;
      }
      const carrierId = form.id ?? json.carrier?.id ?? null;
      if (carrierId && rates.length) {
        for (const r of rates.filter((x) => !x.id && x.name.trim())) {
          await fetch(`/api/admin/shipping/carriers/${carrierId}/rates`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(r),
          });
        }
      }
      if (carrierId && passwordDirty) {
        setForm((f) => ({ ...f, id: carrierId, passwordConfigured: true, apiPassword: "" }));
        setPasswordDirty(false);
      } else if (carrierId && !form.id) {
        setForm((f) => ({ ...f, id: carrierId }));
      }
      return carrierId;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kayıt hatası");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function testHepsijet() {
    setTestMsg("Kaydediliyor / test ediliyor…");
    setErr(null);
    const carrierId = await saveCarrier();
    if (!carrierId) {
      setTestMsg(null);
      return;
    }
    try {
      const res = await fetch(`/api/admin/shipping/carriers/${carrierId}/test`, { method: "POST" });
      const raw = await res.text();
      let j: { message?: string; error?: string } = {};
      if (raw.trim()) {
        try {
          j = JSON.parse(raw) as typeof j;
        } catch {
          setTestMsg(`✗ Test yanıtı okunamadı (HTTP ${res.status})`);
          return;
        }
      }
      setTestMsg(res.ok ? `✓ ${j.message ?? "Bağlantı başarılı"}` : `✗ ${j.error ?? "Bağlantı hatası"}`);
    } catch (e) {
      setTestMsg(`✗ ${e instanceof Error ? e.message : "Bağlantı hatası"}`);
    }
  }

  async function onSave() {
    const id = await saveCarrier();
    if (!id) return;
    router.push("/admin/shipping");
    router.refresh();
  }

  const isHepsijet = form.provider === "hepsijet";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{form.id ? "Kargo firması" : "Yeni kargo firması"}</h1>

      {isHepsijet ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <p className="font-medium">HepsiJet doğrudan API</p>
          <p className="mt-1">
            HepsiJet&apos;ten aldığınız kullanıcı adı, şifre, kısaltma kodu ve gönderici adres ID buraya girilir.
            Geliver kullanmıyorsanız{" "}
            <Link href="/admin/integrations/shipping" className="underline">
              Geliver sayfasını
            </Link>{" "}
            kapalı bırakabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          Manuel kargo: sabit ücret + elle takip no. Otomatik etiket için entegrasyon türünü HepsiJet API seçin veya{" "}
          <Link href="/admin/integrations/shipping" className="underline">
            Geliver
          </Link>{" "}
          kullanın.
        </div>
      )}

      <div className="space-y-4 rounded-xl border bg-white p-6">
        <AdminField label="Entegrasyon türü">
          <select
            className={inputClass}
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value as ShippingProvider })}
          >
            <option value="manual">Manuel (sabit ücret)</option>
            <option value="hepsijet">HepsiJet API (doğrudan)</option>
          </select>
        </AdminField>

        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Kod *" hint="hepsijet, yurtici, aras">
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

        {isHepsijet ? (
          <>
            <h2 className="text-sm font-semibold text-zinc-800">HepsiJet API bilgileri</h2>
            <p className="text-xs text-zinc-500">
              HepsiJet&apos;ten gelen kullanıcı adı, şifre, kısaltma kodu, adres ID ve X-Dock kodunu buraya
              yazın. Şifreyi kaydettikten sonra tekrar görünmez; değiştirmek için yeniden girin. Test
              bitene kadar &quot;Test ortamı&quot; açık kalsın.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.testMode}
                onChange={(e) => setForm({ ...form, testMode: e.target.checked })}
              />
              Test ortamı (integration-apitest.hepsijet.com)
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="API kullanıcı adı *" hint="örn. techizmet_integration">
                <input
                  className={inputClass}
                  value={form.apiUsername}
                  onChange={(e) => setForm({ ...form, apiUsername: e.target.value })}
                  autoComplete="off"
                />
              </AdminField>
              <AdminField label="API şifre *" hint="HepsiJet’ten gelen parola — yalnızca admin’de saklanır">
                <input
                  className={inputClass}
                  type="password"
                  placeholder={form.passwordConfigured && !passwordDirty ? "Kayıtlı — değiştirmek için yazın" : ""}
                  value={form.apiPassword}
                  onChange={(e) => {
                    setPasswordDirty(true);
                    setForm({ ...form, apiPassword: e.target.value });
                  }}
                  autoComplete="new-password"
                />
              </AdminField>
              <AdminField label="Kısaltma kodu *" hint="company_abbreviation_code — örn. TECHİZMET">
                <input
                  className={inputClass}
                  value={form.abbreviationCode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      abbreviationCode: e.target.value.toUpperCase(),
                      apiCustomerCode: e.target.value.toUpperCase(),
                    })
                  }
                />
              </AdminField>
              <AdminField label="Firma adı (HepsiJet) *" hint="company_name — max 30 karakter">
                <input
                  className={inputClass}
                  value={form.companyName}
                  maxLength={30}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </AdminField>
              <AdminField label="Gönderici adres ID *" hint="company_address_id — örn. tech-techizmet-639">
                <input
                  className={inputClass}
                  value={form.companyAddressId}
                  onChange={(e) => setForm({ ...form, companyAddressId: e.target.value })}
                />
              </AdminField>
              <AdminField
                label="Aktarma merkezi kodu *"
                hint="xdock_abbreviation_code — örn. TECHIZMETBAKIRKOY"
              >
                <input
                  className={inputClass}
                  value={form.currentXDockCode}
                  onChange={(e) => setForm({ ...form, currentXDockCode: e.target.value })}
                />
              </AdminField>
              <AdminField label="Ürün kodu">
                <select
                  className={inputClass}
                  value={form.productCode}
                  onChange={(e) => setForm({ ...form, productCode: e.target.value })}
                >
                  <option value="HX_STD">HX_STD — Standart</option>
                  <option value="HX_SD">HX_SD — Aynı gün</option>
                  <option value="HX_ND">HX_ND — Ertesi gün</option>
                  <option value="HX_EX">HX_EX — Express</option>
                </select>
              </AdminField>
              <AdminField label="Teslimat tipi">
                <select
                  className={inputClass}
                  value={form.deliveryType}
                  onChange={(e) => setForm({ ...form, deliveryType: e.target.value })}
                >
                  <option value="RETAIL">RETAIL</option>
                  <option value="MARKET_PLACE">MARKET_PLACE</option>
                  <option value="EXPRESS">EXPRESS</option>
                  <option value="RETURNED">RETURNED</option>
                </select>
              </AdminField>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.autoMarkShipped}
                onChange={(e) => setForm({ ...form, autoMarkShipped: e.target.checked })}
              />
              Etiket sonrası siparişi «Kargoda» yap ve müşteriye bildir
            </label>
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => void testHepsijet()}>
              Bağlantıyı test et
            </button>
            {testMsg ? <p className="text-sm text-zinc-700">{testMsg}</p> : null}
          </>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-zinc-800">Opsiyonel sözleşme bilgileri</h2>
            <div className="grid gap-4 sm:grid-cols-2">
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
          </>
        )}

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
          Aktif — ödeme sayfasında müşteriye göster
        </label>

        <h2 className="pt-4 text-sm font-semibold text-zinc-800">Kargo tarifeleri</h2>
        <p className="text-xs text-zinc-500">
          HepsiJet API ile canlı fiyat gelmez; müşteriye gösterilecek sabit ücreti buradan girin.
        </p>
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
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void onSave()}>
          Kaydet
        </button>
        <button type="button" className={btnSecondary} onClick={() => router.back()}>
          İptal
        </button>
      </div>
    </div>
  );
}
