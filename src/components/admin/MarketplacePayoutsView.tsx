"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatTry } from "@/lib/admin/money";
import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";
import type { PayoutReconciliationReport } from "@/lib/finance/payout-reconciliation";
import { btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";

const STATUS_LABELS: Record<
  PayoutReconciliationReport["batches"][number]["status"],
  { label: string; className: string }
> = {
  ok: { label: "Uyumlu", className: "bg-emerald-100 text-emerald-800" },
  variance: { label: "Fark var", className: "bg-red-100 text-red-800" },
  pending_orders: { label: "Sipariş eşleşmedi", className: "bg-amber-100 text-amber-900" },
  manual: { label: "Manuel / CSV", className: "bg-zinc-100 text-zinc-700" },
};

const FINANCE_PLATFORMS = ["trendyol", "hepsiburada", "amazon_tr"] as const;

const PLATFORM_IMPORT_LABEL: Record<string, string> = {
  trendyol: "Trendyol",
  hepsiburada: "Hepsiburada",
  amazon_tr: "Amazon",
};

export function MarketplacePayoutsView({
  report,
  platform,
  activePlatforms,
}: {
  report: PayoutReconciliationReport;
  platform?: string;
  activePlatforms: Record<string, boolean>;
}) {
  const router = useRouter();
  const csvRef = useRef<HTMLInputElement>(null);
  const [sinceDays, setSinceDays] = useState(30);
  const [importPlatform, setImportPlatform] = useState<string>(
    FINANCE_PLATFORMS.find((p) => activePlatforms[p]) ?? "trendyol",
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const anyActive = FINANCE_PLATFORMS.some((p) => activePlatforms[p]);

  async function importFinance(all = false) {
    setBusy(true);
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/admin/finance/marketplaces/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(all ? { sinceDays, all: true } : { sinceDays, platform: importPlatform }),
    });
    const j = (await res.json()) as {
      result?: { message: string; errors?: string[] };
      results?: { platform: string; message: string; errors?: string[] }[];
      message?: string;
      error?: string;
    };
    setBusy(false);
    if (res.ok) {
      if (j.results) {
        setMsg(j.message ?? j.results.map((r) => `${r.platform}: ${r.message}`).join(" · "));
        const allErrors = j.results.flatMap((r) => r.errors ?? []);
        if (allErrors.length) setErr(allErrors.join(" · "));
      } else if (j.result) {
        setMsg(j.result.message);
        if (j.result.errors?.length) setErr(j.result.errors.join(" · "));
      }
      router.refresh();
    } else {
      setErr(j.error ?? "İçe aktarma başarısız");
    }
  }

  async function uploadCsv(file: File) {
    setBusy(true);
    setMsg(null);
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/finance/payouts/import-csv", { method: "POST", body: fd });
    const j = (await res.json()) as {
      result?: { message: string; parseErrors?: string[] };
      error?: string;
      parseErrors?: string[];
    };
    setBusy(false);
    if (res.ok && j.result) {
      setMsg(j.result.message);
      if (j.result.parseErrors?.length) setErr(j.result.parseErrors.join(" · "));
      router.refresh();
    } else {
      setErr(j.error ?? j.parseErrors?.join(" · ") ?? "CSV içe aktarma başarısız");
    }
  }

  const filterPlatforms = ["trendyol", "hepsiburada", "amazon_tr"];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/finance/payouts"
          className={`rounded-lg border px-3 py-1.5 text-sm ${!platform ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
        >
          Tümü
        </Link>
        {filterPlatforms.map((p) => {
          const label = MARKETPLACE_PLATFORMS.find((x) => x.id === p)?.label ?? p;
          return (
            <Link
              key={p}
              href={`/admin/finance/payouts?platform=${p}`}
              className={`rounded-lg border px-3 py-1.5 text-sm ${platform === p ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
            >
              {label}
            </Link>
          );
        })}
        <Link href="/admin/finance/profitability" className={btnSecondary}>
          Kârlılık raporu →
        </Link>
      </div>

      <section className="admin-card admin-card-pad mt-6">
        <h2 className="font-semibold">Hakediş içe aktarma</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Trendyol cari hesap, Hepsiburada MpFinance ve Amazon SP-API Finances ile hakediş + kesinti
          faturaları çekilir. API yoksa banka ekstresinden CSV yükleyin.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          {anyActive ? (
            <>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-zinc-500">Platform</span>
                <select
                  className={inputClass}
                  value={importPlatform}
                  onChange={(e) => setImportPlatform(e.target.value)}
                >
                  {FINANCE_PLATFORMS.filter((p) => activePlatforms[p]).map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_IMPORT_LABEL[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-zinc-500">Dönem</span>
                <select
                  className={inputClass}
                  value={sinceDays}
                  onChange={(e) => setSinceDays(Number(e.target.value))}
                >
                  <option value={15}>Son 15 gün</option>
                  <option value={30}>Son 30 gün</option>
                  <option value={60}>Son 60 gün</option>
                  <option value={90}>Son 90 gün</option>
                </select>
              </label>
              <button
                type="button"
                className={btnPrimary}
                disabled={busy}
                onClick={() => void importFinance(false)}
              >
                {busy ? "Çekiliyor…" : "Seçili platformdan çek"}
              </button>
              {FINANCE_PLATFORMS.filter((p) => activePlatforms[p]).length > 1 ? (
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={busy}
                  onClick={() => void importFinance(true)}
                >
                  Tüm aktif platformlar
                </button>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-amber-800">
              API için{" "}
              <Link href="/admin/integrations" className="underline">
                Pazaryeri entegrasyonları
              </Link>{" "}
              sayfasından Trendyol, Hepsiburada veya Amazon ayarlarını tamamlayın.
            </p>
          )}

          <input
            ref={csvRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadCsv(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className={btnSecondary}
            disabled={busy}
            onClick={() => csvRef.current?.click()}
          >
            CSV yükle
          </button>
          <a
            href="data:text/csv;charset=utf-8,tarih%3Btutar%3Bplatform%3Breferans%3Baciklama%0A2025-01-15%3B12500.50%3Btrendyol%3BPO-123456%3BHakedi%C5%9F%20%C3%B6demesi%0A2025-01-20%3B8400%3Bhepsiburada%3BSET-789%3BHB%20hakedi%C5%9F%0A2025-01-22%3B15200%3Bamazon_tr%3BAMZ-GRP-1%3BAmazon%20%C3%B6deme"
            download="hakedis-sablon.csv"
            className={btnSecondary}
          >
            CSV şablon
          </a>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 space-y-1">
          <p>
            <strong>Trendyol:</strong> sellerId + API Key/Secret (cari hesap API)
          </p>
          <p>
            <strong>Hepsiburada:</strong> merchant ID + API Key/Secret (MpFinance — ayrı finans URL
            isteğe bağlı)
          </p>
          <p>
            <strong>Amazon:</strong> sellerId, LWA Client ID/Secret, Refresh Token (SP-API Finances,
            bölge: EU)
          </p>
        </div>

        {msg ? <p className="mt-3 text-sm text-emerald-800">{msg}</p> : null}
        {err ? <p className="mt-2 text-sm text-amber-800">{err}</p> : null}
      </section>

      <div className="admin-kpi-grid mt-6">
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#2563eb" }}>
          <p className="admin-kpi-label">Toplam hakediş</p>
          <p className="admin-kpi-value">{formatTry(report.totals.payoutMinor)}</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#16a34a" }}>
          <p className="admin-kpi-label">Beklenen net (API)</p>
          <p className="admin-kpi-value">
            {report.totals.expectedMinor != null ? formatTry(report.totals.expectedMinor) : "—"}
          </p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#dc2626" }}>
          <p className="admin-kpi-label">Toplam fark</p>
          <p className="admin-kpi-value">
            {report.totals.varianceMinor != null ? formatTry(report.totals.varianceMinor) : "—"}
          </p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "var(--kn-brand)" }}>
          <p className="admin-kpi-label">Açık pazaryeri satışı</p>
          <p className="admin-kpi-value">{report.totals.unlinkedOrders}</p>
        </div>
      </div>

      <section className="admin-card admin-card-pad mt-8 overflow-x-auto">
        <h2 className="font-semibold">Hakediş ödemeleri</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Bankaya yatan tutar vs sipariş netleri (ödeme / settlement / event group eşleşmesi)
        </p>
        {report.batches.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Henüz hakediş kaydı yok. Platformdan çekin veya CSV yükleyin.
          </p>
        ) : (
          <table className="mt-4 w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2">Tarih</th>
                <th className="pb-2">Platform</th>
                <th className="pb-2">Ödeme no</th>
                <th className="pb-2 text-right">Bankaya yatan</th>
                <th className="pb-2 text-right">Beklenen net</th>
                <th className="pb-2 text-right">Fark</th>
                <th className="pb-2 text-right">Sipariş</th>
                <th className="pb-2">Durum</th>
              </tr>
            </thead>
            <tbody>
              {report.batches.map((b) => {
                const st = STATUS_LABELS[b.status];
                const platformLabel =
                  MARKETPLACE_PLATFORMS.find((x) => x.id === b.platform)?.label ?? b.platform;
                return (
                  <tr key={b.id} className="border-b border-zinc-100">
                    <td className="py-2">{new Date(b.payoutDate).toLocaleDateString("tr-TR")}</td>
                    <td className="py-2">{platformLabel}</td>
                    <td className="py-2 font-mono text-xs">{b.paymentOrderId ?? "—"}</td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {formatTry(b.payoutAmountMinor)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {b.expectedNetMinor != null ? formatTry(b.expectedNetMinor) : "—"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {b.varianceMinor != null ? (
                        <span className={Math.abs(b.varianceMinor) > 100 ? "text-red-700" : "text-emerald-700"}>
                          {b.varianceMinor > 0 ? "+" : ""}
                          {formatTry(b.varianceMinor)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">{b.orderCount || "—"}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${st.className}`}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
