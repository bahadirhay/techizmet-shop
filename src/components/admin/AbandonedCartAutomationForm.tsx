"use client";

import { useEffect, useState } from "react";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";

type AbandonedCartAutomation = {
  enabled?: boolean;
  discountCode?: string;
};

export function AbandonedCartAutomationForm() {
  const [settings, setSettings] = useState<AbandonedCartAutomation | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/abandoned-carts/automation")
      .then((r) => r.json())
      .then((d: { abandonedCart?: AbandonedCartAutomation }) => setSettings(d.abandonedCart ?? {}))
      .catch(() => setSettings({}));
  }, []);

  async function save() {
    if (!settings) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/abandoned-carts/automation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setMsg(res.ok ? "Kaydedildi" : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  }

  if (!settings) return null;

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Otomatik hatırlatma dizisi</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Açıkken: 1. saat basit hatırlatma, ~24. saat indirim kodlu, ~72. saat son çağrı —
            toplam 3 e-posta, otomatik gönderilir.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(settings.enabled)}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
          />
          Açık
        </label>
      </div>
      <div className="mt-3 max-w-xs">
        <AdminField label="İndirim kodu (2. ve 3. e-postada önerilir)">
          <input
            className={inputClass}
            placeholder="ör. GERIDON10"
            value={settings.discountCode ?? ""}
            onChange={(e) => setSettings({ ...settings, discountCode: e.target.value })}
          />
        </AdminField>
        <p className="mt-1 text-xs text-zinc-500">
          Kampanyalar sayfasından aktif bir kupon kodu oluşturup buraya yazın. Boş bırakılırsa
          indirim olmadan gönderilir.
        </p>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className={btnPrimary} disabled={busy} onClick={save}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
        {msg ? <span className="text-sm text-green-700">{msg}</span> : null}
      </div>
    </div>
  );
}
