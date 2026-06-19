"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import type { GeliverSiteSettings } from "@/lib/shipping/geliver/types";

export function GeliverSettingsForm({
  initialGeliver,
  tokenConfigured,
  webhookUrl,
}: {
  initialGeliver: GeliverSiteSettings;
  tokenConfigured: boolean;
  webhookUrl: string;
}) {
  const [g, setG] = useState<GeliverSiteSettings>(initialGeliver);
  const [msg, setMsg] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tokenDirty, setTokenDirty] = useState(false);

  async function save(patch?: Partial<GeliverSiteSettings>) {
    setBusy(true);
    setMsg(null);
    const payload: GeliverSiteSettings = { ...g, ...patch };
    const body: GeliverSiteSettings = { ...payload };
    if (!tokenDirty && tokenConfigured) {
      delete body.apiToken;
    }
    const res = await fetch("/api/admin/integrations/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geliver: body }),
    });
    setBusy(false);
    if (!res.ok) {
      setMsg("Kayıt hatası");
      return false;
    }
    setG(payload);
    setMsg("Kaydedildi");
    return true;
  }

  async function testConnection() {
    setTestMsg(null);
    if (!(await save())) return;
    const res = await fetch("/api/admin/integrations/geliver/test", { method: "POST" });
    const j = (await res.json()) as { ok?: boolean; message?: string; error?: string };
    setTestMsg(res.ok ? (j.message ?? "Bağlantı başarılı") : (j.error ?? "Bağlantı hatası"));
  }

  async function createSender() {
    setTestMsg(null);
    if (!(await save())) return;
    const res = await fetch("/api/admin/integrations/geliver/test", { method: "PUT" });
    const j = (await res.json()) as { ok?: boolean; senderAddressId?: string; error?: string };
    if (!res.ok) {
      setTestMsg(j.error ?? "Gönderici oluşturulamadı");
      return;
    }
    if (j.senderAddressId) {
      const next = { ...g, senderAddressId: j.senderAddressId, enabled: true };
      setG(next);
      await save({ senderAddressId: j.senderAddressId, enabled: true });
      setTestMsg(`Gönderici adresi kaydedildi: ${j.senderAddressId}`);
    }
  }

  const parcel = g.parcel ?? {};
  const hasToken = tokenConfigured || Boolean(g.apiToken?.trim());

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <p className="font-medium">Geliver yalnızca API token ile çalışır</p>
        <p className="mt-1 text-sky-900/90">
          «Kod ve ad gerekli» uyarısı <strong>Kargo Firmaları → Yeni firma</strong> sayfasındandır; Geliver
          için oraya değil, bu sayfaya token girin. Kargo firması kaydı otomatik oluşturulur.
        </p>
        <p className="mt-2">
          <Link href="/admin/shipping" className="underline">
            Kargo firmaları listesi
          </Link>
        </p>
      </div>

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Geliver API</h2>
        <p className="text-sm text-zinc-600">
          Token:{" "}
          <a href="https://app.geliver.io/apitokens" target="_blank" rel="noreferrer" className="underline">
            app.geliver.io/apitokens
          </a>
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={g.enabled === true}
            onChange={(e) => setG({ ...g, enabled: e.target.checked })}
          />
          Geliver entegrasyonu aktif
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={g.testMode === true}
            onChange={(e) => setG({ ...g, testMode: e.target.checked })}
          />
          Test modu (ücret alınmaz)
        </label>
        <AdminField label="API token *">
          <input
            className={inputClass}
            type="password"
            placeholder={hasToken && !tokenDirty ? "Kayıtlı — değiştirmek için yeni token yazın" : "Geliver panelinden kopyalayın"}
            value={g.apiToken ?? ""}
            onChange={(e) => {
              setTokenDirty(true);
              setG({ ...g, apiToken: e.target.value });
            }}
          />
          {hasToken && !tokenDirty ? (
            <p className="mt-1 text-xs text-green-700">Token kayıtlı</p>
          ) : null}
        </AdminField>
        <AdminField label="Gönderici adres ID">
          <input
            className={inputClass}
            value={g.senderAddressId ?? ""}
            onChange={(e) => setG({ ...g, senderAddressId: e.target.value })}
            placeholder="Otomatik oluşturulur — manuel girmeniz gerekmez"
            readOnly={Boolean(g.senderAddressId)}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Önce{" "}
            <Link href="/admin/settings/store" className="underline">
              Mağaza ayarları → gönderici adresi
            </Link>{" "}
            doldurun, sonra «Gönderici adresi oluştur».
          </p>
        </AdminField>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => void testConnection()}>
            Bağlantıyı test et
          </button>
          <button type="button" className={btnSecondary} disabled={busy || !hasToken} onClick={() => void createSender()}>
            Gönderici adresi oluştur
          </button>
        </div>
        {testMsg ? <p className="text-sm text-zinc-700">{testMsg}</p> : null}
      </section>

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Gönderi davranışı</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={g.autoAcceptCheapestOffer !== false}
            onChange={(e) => setG({ ...g, autoAcceptCheapestOffer: e.target.checked })}
          />
          En ucuz teklifi otomatik kabul et
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={g.autoMarkShipped !== false}
            onChange={(e) => setG({ ...g, autoMarkShipped: e.target.checked })}
          />
          Etiket alındığında siparişi «Kargoda» yap ve müşteriye bildir
        </label>
        <AdminField label="Tercih edilen servis kodu (opsiyonel)">
          <input
            className={inputClass}
            value={g.providerServiceCode ?? ""}
            onChange={(e) => setG({ ...g, providerServiceCode: e.target.value })}
            placeholder="Boş bırakın — Geliver en uygun teklifi sunar"
          />
        </AdminField>
      </section>

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Varsayılan paket ölçüleri</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["length", "width", "height", "weight"] as const).map((key) => (
            <AdminField key={key} label={key}>
              <input
                className={inputClass}
                value={parcel[key] ?? ""}
                onChange={(e) =>
                  setG({
                    ...g,
                    parcel: { ...parcel, [key]: e.target.value },
                  })
                }
              />
            </AdminField>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Webhook</h2>
        <p className="text-sm text-zinc-600">
          Geliver panelinde bu URL&apos;yi tanımlayın; takip güncellemeleri otomatik işlenir.
        </p>
        <code className="block rounded bg-zinc-100 px-3 py-2 text-xs break-all">{webhookUrl}</code>
        <AdminField label="Webhook secret (opsiyonel)">
          <input
            className={inputClass}
            type="password"
            value={g.webhookSecret ?? ""}
            onChange={(e) => setG({ ...g, webhookSecret: e.target.value })}
          />
        </AdminField>
      </section>

      <div className="flex items-center gap-3">
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>
          Kaydet
        </button>
        {msg ? <span className="text-sm text-green-700">{msg}</span> : null}
      </div>
    </div>
  );
}
