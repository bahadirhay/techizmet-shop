"use client";

import { useCallback, useEffect, useState } from "react";
import { btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import type { CookieConsentLogRow, CookieConsentStats } from "@/lib/cookie-consent/types";

type ConfigState = {
  policyVersion: string;
  retentionDays: number;
  reconsentDays: number;
  enabled: boolean;
};

export function CookieConsentLogs() {
  const [rows, setRows] = useState<CookieConsentLogRow[]>([]);
  const [stats, setStats] = useState<CookieConsentStats | null>(null);
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [purpose, setPurpose] = useState("");
  const [decision, setDecision] = useState("");
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    const params = new URLSearchParams();
    if (decision) params.set("decision", decision);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/cookie-consents?${params}`);
    const d = (await res.json()) as {
      rows?: CookieConsentLogRow[];
      stats?: CookieConsentStats;
      config?: ConfigState;
      purpose?: string;
      purged?: number;
      error?: string;
    };
    setBusy(false);
    if (!res.ok) {
      setErr(d.error ?? "Yüklenemedi");
      return;
    }
    setRows(d.rows ?? []);
    setStats(d.stats ?? null);
    if (d.config) setConfig(d.config);
    setPurpose(d.purpose ?? "");
    if (d.purged && d.purged > 0) {
      setMsg(`Saklama politikası: ${d.purged} eski kayıt silindi.`);
    }
  }, [decision, q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings() {
    if (!config) return;
    setSettingsBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/cookie-consents/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const d = (await res.json()) as { config?: ConfigState; error?: string };
    setSettingsBusy(false);
    if (!res.ok) {
      setErr(d.error ?? "Ayar kaydedilemedi");
      return;
    }
    if (d.config) setConfig(d.config);
    setMsg(
      "Uyumluluk ayarları kaydedildi. Politika sürümü değiştiyse ziyaretçilerden yeniden onay istenir.",
    );
    void load();
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (decision) params.set("decision", decision);
    window.location.href = `/api/admin/cookie-consents/export?${params}`;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">Bu bir iletişim listesi değildir</p>
        <p className="mt-1 opacity-90">
          {purpose ||
            "Kayıtlar KVKK ispat yükümlülüğü içindir. IP veya cihaz anahtarıyla müşteriye ulaşılmaz; pazarlama e-postası / WhatsApp burada başlamaz."}
        </p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs opacity-90">
          <li>
            <strong>İspat:</strong> denetim veya şikayette “şu tarihte, şu tercihle onay alındı”
          </li>
          <li>
            <strong>Script kontrolü:</strong> analitik / pazarlama yalnızca ilgili rıza sonrası çalışır
          </li>
          <li>
            <strong>Müşteriye dönüş:</strong> sipariş, hesap, bülten, sepet hatırlatma — ayrı kanallar
          </li>
        </ul>
      </div>

      {config ? (
        <section className="admin-card admin-card-pad space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Uyumluluk ayarları</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Politika sürümü değişince mevcut onaylar geçersiz sayılır; ziyaretçi yeniden seçim yapar.
              Saklama süresi dolan loglar otomatik temizlenir.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              Politika sürümü
              <input
                className={`${inputClass} mt-1`}
                value={config.policyVersion}
                onChange={(e) => setConfig({ ...config, policyVersion: e.target.value })}
                placeholder="2026-09"
              />
            </label>
            <label className="block text-sm">
              Saklama (gün)
              <input
                type="number"
                min={30}
                max={3650}
                className={`${inputClass} mt-1`}
                value={config.retentionDays}
                onChange={(e) =>
                  setConfig({ ...config, retentionDays: parseInt(e.target.value, 10) || 730 })
                }
              />
            </label>
            <label className="block text-sm">
              Yeniden onay (gün)
              <input
                type="number"
                min={0}
                max={3650}
                className={`${inputClass} mt-1`}
                value={config.reconsentDays}
                onChange={(e) =>
                  setConfig({ ...config, reconsentDays: parseInt(e.target.value, 10) || 0 })
                }
              />
              <span className="mt-1 block text-xs text-zinc-500">0 = yalnızca sürüm değişince</span>
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              />
              Banner açık
            </label>
          </div>
          <button
            type="button"
            className={btnPrimary}
            disabled={settingsBusy}
            onClick={() => void saveSettings()}
          >
            {settingsBusy ? "Kaydediliyor…" : "Uyumluluk ayarlarını kaydet"}
          </button>
        </section>
      ) : null}

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Toplam olay" value={String(stats.total)} />
          <StatCard
            label="Kabul oranı"
            value={`%${stats.acceptRate}`}
            hint={`${stats.accepted} kabul · ${stats.rejected} red`}
            tone="ok"
          />
          <StatCard
            label="Pazarlama opt-in"
            value={`%${stats.marketingOptInRate}`}
            hint={`${stats.marketingOptIn} / ${stats.uniqueDevices} cihaz`}
          />
          <StatCard
            label="Analitik opt-in"
            value={`%${stats.analyticsOptInRate}`}
            hint={`Son 7g: ${stats.last7Days} · 30g: ${stats.last30Days}`}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          Karar
          <select
            className={`${inputClass} mt-1 block min-w-[10rem]`}
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
          >
            <option value="">Tümü</option>
            <option value="accepted">accepted</option>
            <option value="rejected">rejected</option>
            <option value="custom">custom</option>
            <option value="withdrawn">withdrawn</option>
          </select>
        </label>
        <label className="min-w-[14rem] flex-1 text-sm">
          Ara (cihaz / IP / sürüm)
          <input
            className={`${inputClass} mt-1`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ör. 414e veya 2026-09"
          />
        </label>
        <button type="button" className={btnSecondary} disabled={busy} onClick={() => void load()}>
          {busy ? "Yükleniyor…" : "Yenile"}
        </button>
        <button type="button" className={btnSecondary} onClick={exportCsv}>
          CSV indir (denetim)
        </button>
        <a href="/admin/settings/navigation" className="self-center text-sm underline">
          Banner metinleri
        </a>
      </div>

      {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      {!rows.length ? (
        <p className="text-sm text-zinc-600">Henüz kayıt yok.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left">
                <th className="p-3">Tarih</th>
                <th className="p-3">Karar</th>
                <th className="p-3">Kaynak</th>
                <th className="p-3">Sürüm</th>
                <th className="p-3">Cihaz</th>
                <th className="p-3">IP</th>
                <th className="p-3">Tercihler</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap p-3">
                    {new Date(r.createdAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="p-3">
                    <DecisionBadge decision={r.decision} />
                  </td>
                  <td className="p-3 font-mono text-xs">{r.source ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{r.policyVersion ?? "—"}</td>
                  <td className="p-3 font-mono text-xs" title={r.consentKey}>
                    {r.consentKey.slice(0, 12)}…
                  </td>
                  <td className="p-3">{r.ipAddress ?? "—"}</td>
                  <td className="max-w-xs truncate p-3 font-mono text-xs" title={r.preferences ?? ""}>
                    {r.preferences ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${tone === "ok" ? "text-emerald-700" : "text-zinc-900"}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const cls =
    decision === "accepted"
      ? "bg-emerald-50 text-emerald-800"
      : decision === "rejected" || decision === "withdrawn"
        ? "bg-zinc-100 text-zinc-600"
        : "bg-sky-50 text-sky-800";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {decision}
    </span>
  );
}
