"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type InvoiceEntryRow,
  type InvoiceDirection,
  type KdvRate,
  KDV_RATES,
  KDV_RATE_LABELS,
  calcKdv,
  calcYearlyKdv,
  minorToTl,
  MONTHS_TR,
} from "@/lib/finance/kdv";

// ── helpers ────────────────────────────────────────────────────────────────────
function fmt(minor: number) {
  return minorToTl(minor) + " ₺";
}

function tlToMinorLocal(s: string): number {
  return Math.round(parseFloat(s.replace(",", ".") || "0") * 100) || 0;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const DIRECTION_LABELS: Record<InvoiceDirection, string> = {
  outgoing: "Kesilen (Satış)",
  incoming: "Gelen (Alış/Gider)",
};

// ── form state ─────────────────────────────────────────────────────────────────
type FormState = {
  direction: InvoiceDirection;
  invoiceDate: string;
  invoiceNo: string;
  counterparty: string;
  netTl: string;
  kdvRate: KdvRate;
  description: string;
};

const emptyForm = (): FormState => ({
  direction: "outgoing",
  invoiceDate: todayIso(),
  invoiceNo: "",
  counterparty: "",
  netTl: "",
  kdvRate: 20,
  description: "",
});

// ── sub-components ─────────────────────────────────────────────────────────────
function KdvBar({
  label,
  amount,
  color,
}: {
  label: string;
  amount: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-1.5 text-sm last:border-0">
      <span className="text-zinc-600">{label}</span>
      <span className={`font-semibold tabular-nums ${color}`}>{fmt(amount)}</span>
    </div>
  );
}

function MonthCard({
  month,
  summary,
  onClick,
  active,
}: {
  month: number;
  summary: ReturnType<typeof calcYearlyKdv>[number];
  onClick: () => void;
  active: boolean;
}) {
  const hasTx = summary.hesaplananKdv > 0 || summary.indirilecekKdv > 0;
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-all ${
        active
          ? "border-blue-500 bg-blue-50 shadow-sm"
          : hasTx
          ? "border-zinc-200 bg-white hover:border-blue-300"
          : "border-dashed border-zinc-200 bg-zinc-50/50 hover:bg-white"
      }`}
    >
      <div className="mb-1 text-xs font-semibold text-zinc-500">{MONTHS_TR[month - 1]}</div>
      {hasTx ? (
        <>
          <div className="text-xs text-zinc-500">
            ↑ {fmt(summary.hesaplananKdv)} &nbsp; ↓ {fmt(summary.indirilecekKdv)}
          </div>
          {summary.odenecekKdv > 0 ? (
            <div className="mt-1 text-sm font-bold text-red-600">Öd: {fmt(summary.odenecekKdv)}</div>
          ) : (
            <div className="mt-1 text-sm font-semibold text-emerald-600">Dev: {fmt(summary.yeniDevredenKdv)}</div>
          )}
        </>
      ) : (
        <div className="text-xs text-zinc-400">Fatura yok</div>
      )}
    </button>
  );
}

// ── main component ─────────────────────────────────────────────────────────────
export function KdvTracker({
  initialYear,
  initialEntries,
}: {
  initialYear: number;
  initialEntries: InvoiceEntryRow[];
}) {
  const [year, setYear] = useState(initialYear);
  const [entries, setEntries] = useState<InvoiceEntryRow[]>(initialEntries);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth() + 1);
  const [devredenBaslangic, setDevredenBaslangic] = useState(0);
  const [devredenTl, setDevredenTl] = useState("");
  const [filterDir, setFilterDir] = useState<"" | InvoiceDirection>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [gibSyncing, setGibSyncing] = useState(false);
  const [gibMsg, setGibMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const loadYear = useCallback(async (y: number) => {
    setYear(y);
    const r = await fetch(`/api/admin/finance/invoices?year=${y}`);
    const data = (await r.json()) as { entries?: InvoiceEntryRow[] };
    setEntries(data.entries ?? []);
  }, []);

  const gibSync = useCallback(async () => {
    setGibSyncing(true);
    setGibMsg(null);
    try {
      const r = await fetch("/api/admin/finance/invoices/gib-sync", { method: "POST" });
      const data = (await r.json()) as { message?: string; error?: string; kdvEntriesCreated?: number };
      if (!r.ok) {
        setGibMsg({ text: data.error ?? "GİB senkronizasyonu başarısız.", ok: false });
        return;
      }
      setGibMsg({ text: data.message ?? "Senkronize edildi.", ok: true });
      // Yeni KDV girişleri varsa listeyi yenile
      if ((data.kdvEntriesCreated ?? 0) > 0) {
        const re = await fetch(`/api/admin/finance/invoices?year=${year}`);
        const rd = (await re.json()) as { entries?: InvoiceEntryRow[] };
        setEntries(rd.entries ?? []);
      }
    } finally {
      setGibSyncing(false);
      window.setTimeout(() => setGibMsg(null), 6000);
    }
  }, [year]);

  const monthlySummaries = useMemo(
    () => calcYearlyKdv(entries, year, devredenBaslangic),
    [entries, year, devredenBaslangic],
  );

  const activeSummary = monthlySummaries[activeMonth - 1]!;

  const activeEntries = useMemo(() => {
    return entries
      .filter((e) => {
        const d = new Date(e.invoiceDate);
        const monthMatch = d.getUTCFullYear() === year && d.getUTCMonth() + 1 === activeMonth;
        const dirMatch = !filterDir || e.direction === filterDir;
        return monthMatch && dirMatch;
      })
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  }, [entries, year, activeMonth, filterDir]);

  // Yıl özeti
  const yearSummary = useMemo(() => {
    let outNet = 0, inNet = 0, totalOdenecek = 0;
    for (const s of monthlySummaries) {
      outNet += s.outgoingNet;
      inNet += s.incomingNet;
      totalOdenecek += s.odenecekKdv;
    }
    return { outNet, inNet, netKazan: outNet - inNet, totalOdenecek };
  }, [monthlySummaries]);

  // KDV tutarını otomatik hesapla
  const computedKdvMinor = useMemo(() => {
    const net = tlToMinorLocal(form.netTl);
    return calcKdv(net, form.kdvRate);
  }, [form.netTl, form.kdvRate]);

  async function submit() {
    const netMinor = tlToMinorLocal(form.netTl);
    if (!netMinor || !form.invoiceDate) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: form.direction,
          invoiceDate: new Date(form.invoiceDate).toISOString(),
          invoiceNo: form.invoiceNo || null,
          counterparty: form.counterparty || null,
          netMinor,
          kdvRate: form.kdvRate,
          kdvMinor: computedKdvMinor,
          description: form.description || null,
        }),
      });
      const data = (await r.json()) as { entry?: InvoiceEntryRow };
      if (data.entry) {
        setEntries((prev) => [data.entry!, ...prev]);
        setForm(emptyForm());
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/admin/finance/invoices/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeleteId(null);
  }

  const years = [year - 1, year, year + 1];

  return (
    <div className="space-y-6">
      {/* Yıl seçici + devreden KDV başlangıç */}
      <div className="admin-card admin-card-pad flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Vergi Yılı</label>
          <select
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            value={year}
            onChange={(e) => {
              void loadYear(parseInt(e.target.value, 10));
            }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Ocak başı devreden KDV (önceki yıldan, TL)
          </label>
          <input
            type="text"
            className="w-40 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            placeholder="0,00"
            value={devredenTl}
            onChange={(e) => {
              setDevredenTl(e.target.value);
              setDevredenBaslangic(tlToMinorLocal(e.target.value));
            }}
          />
        </div>
        {/* GİB senkronizasyon */}
        <div className="flex flex-col justify-end">
          <button
            className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            onClick={() => void gibSync()}
            disabled={gibSyncing}
          >
            {gibSyncing ? "GİB'e bağlanıyor…" : "📥 GİB'den Fatura Çek"}
          </button>
          <p className="mt-1 text-xs text-zinc-400">
            e-Arşiv gelen kutusundan otomatik içe aktar
          </p>
        </div>
      </div>
      {/* GİB bildirim mesajı */}
      {gibMsg && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            gibMsg.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {gibMsg.ok ? "✓ " : "✗ "}{gibMsg.text}
          {!gibMsg.ok && (
            <span className="ml-2 text-xs opacity-70">
              GİB ayarları için{" "}
              <a href="/admin/settings/efatura" className="underline">
                /admin/settings/efatura
              </a>{" "}
              sayfasını kontrol edin.
            </span>
          )}
        </div>
      )}

      {/* Yıllık özet şerit */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(
          [
            { label: "Toplam Satış (KDV hariç)", value: yearSummary.outNet, color: "text-blue-700" },
            { label: "Toplam Gider (KDV hariç)", value: yearSummary.inNet, color: "text-zinc-700" },
            { label: "Tahmini Net Kazanç", value: yearSummary.netKazan, color: "text-emerald-700" },
            { label: "Toplam Ödenecek KDV", value: yearSummary.totalOdenecek, color: "text-red-700" },
          ] as const
        ).map((c) => (
          <div key={c.label} className="admin-card admin-card-pad">
            <div className="text-xs text-zinc-500">{c.label}</div>
            <div className={`mt-1 text-xl font-bold ${c.color}`}>{fmt(c.value)}</div>
          </div>
        ))}
      </div>

      {/* KDV teorisi bilgi kutusu */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
        <div className="mb-2 font-semibold">Nasıl çalışır?</div>
        <div className="space-y-1 text-xs">
          <div>
            📤 <strong>Kesilen fatura (Satış)</strong>: Müşteriden tahsil ettiğiniz KDV → Hesaplanan KDV
          </div>
          <div>
            📥 <strong>Gelen fatura (Alış/Gider)</strong>: Tedarikçiye ödediğiniz KDV → İndirilecek KDV
          </div>
          <div>
            💡 <strong>Ödenecek KDV</strong> = Hesaplanan − İndirilecek − Devreden KDV (GİB&apos;e yatırılır)
          </div>
          <div>
            🔄 Hesaplanan &lt; İndirilecek ise fark <strong>devreden KDV</strong> olarak sonraki aya taşınır
            (iade değil)
          </div>
          <div>
            📅 KDV beyannamesi son tarihi: <strong>Takip eden ayın 28&apos;i</strong>
          </div>
        </div>
      </div>

      {/* Aylık grid */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700">
          Aylık KDV Özeti — Detay için aya tıklayın
        </h3>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
          {monthlySummaries.map((s, i) => (
            <MonthCard
              key={i}
              month={i + 1}
              summary={s}
              active={activeMonth === i + 1}
              onClick={() => setActiveMonth(i + 1)}
            />
          ))}
        </div>
      </div>

      {/* Seçili ay detayı */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* KDV özet kutusu */}
        <div className="admin-card admin-card-pad">
          <h3 className="mb-3 font-semibold text-zinc-800">
            {MONTHS_TR[activeMonth - 1]} {year} — KDV Hesabı
          </h3>
          <KdvBar
            label="Hesaplanan KDV (satış)"
            amount={activeSummary.hesaplananKdv}
            color="text-blue-700"
          />
          <KdvBar
            label="İndirilecek KDV (alış)"
            amount={activeSummary.indirilecekKdv}
            color="text-zinc-700"
          />
          <KdvBar
            label="Devreden KDV (önceki ay)"
            amount={activeSummary.devredenKdv}
            color="text-orange-600"
          />
          <div className="mt-2 rounded-lg border-2 border-dashed px-3 py-2">
            {activeSummary.odenecekKdv > 0 ? (
              <>
                <div className="text-xs text-zinc-500">Ödenecek KDV (GİB&apos;e yatırılacak)</div>
                <div className="text-2xl font-bold text-red-600">{fmt(activeSummary.odenecekKdv)}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  Son tarih: {MONTHS_TR[activeMonth % 12]} {activeMonth === 12 ? year + 1 : year} 28
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-zinc-500">Ödenecek KDV yok — Sonraki aya devreden</div>
                <div className="text-2xl font-bold text-emerald-600">
                  {fmt(activeSummary.yeniDevredenKdv)}
                </div>
              </>
            )}
          </div>
          <div className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
            <div className="flex justify-between">
              <span>KDV hariç satış</span>
              <span className="font-medium">{fmt(activeSummary.outgoingNet)}</span>
            </div>
            <div className="flex justify-between">
              <span>KDV hariç gider</span>
              <span className="font-medium">{fmt(activeSummary.incomingNet)}</span>
            </div>
            <div className="mt-1 flex justify-between font-semibold text-zinc-700">
              <span>Net kazanç (tahmini)</span>
              <span>{fmt(activeSummary.outgoingNet - activeSummary.incomingNet)}</span>
            </div>
          </div>
        </div>

        {/* Fatura listesi */}
        <div className="admin-card admin-card-pad lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-zinc-800">
              {MONTHS_TR[activeMonth - 1]} Faturaları ({activeEntries.length})
            </h3>
            <select
              className="rounded border border-zinc-300 px-2 py-1 text-xs"
              value={filterDir}
              onChange={(e) => setFilterDir(e.target.value as "" | InvoiceDirection)}
            >
              <option value="">Tümü</option>
              <option value="outgoing">Kesilen</option>
              <option value="incoming">Gelen</option>
            </select>
          </div>
          {activeEntries.length === 0 ? (
            <p className="text-sm text-zinc-400">Bu ay için fatura yok.</p>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {activeEntries.map((e) => (
                <div
                  key={e.id}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    e.direction === "outgoing"
                      ? "border-blue-100 bg-blue-50/40"
                      : "border-zinc-100 bg-zinc-50/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-xs font-semibold ${
                          e.direction === "outgoing" ? "text-blue-700" : "text-zinc-600"
                        }`}
                      >
                        {e.direction === "outgoing" ? "📤" : "📥"}{" "}
                        {DIRECTION_LABELS[e.direction as InvoiceDirection]}
                      </span>
                      {e.invoiceNo && (
                        e.invoiceNo.startsWith("gib:") ? (
                          <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                            GİB e-Arşiv
                          </span>
                        ) : (
                          <span className="ml-2 text-xs text-zinc-400">#{e.invoiceNo}</span>
                        )
                      )}
                      {e.counterparty && (
                        <div className="truncate text-xs text-zinc-500">{e.counterparty}</div>
                      )}
                      {e.description && (
                        <div className="truncate text-xs text-zinc-400">{e.description}</div>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-right">
                      <div className="text-xs text-zinc-400">
                        {new Date(e.invoiceDate).toLocaleDateString("tr-TR")}
                      </div>
                      <div className="font-semibold text-zinc-800">
                        {fmt(e.netMinor)}{" "}
                        <span className="text-xs font-normal text-zinc-400">net</span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        +%{e.kdvRate} KDV = {fmt(e.kdvMinor)}
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteId(e.id)}
                      className="ml-1 text-xs text-red-400 hover:text-red-600"
                      title="Sil"
                    >
                      ✕
                    </button>
                  </div>
                  {deleteId === e.id && (
                    <div className="mt-2 flex gap-2 text-xs">
                      <button
                        className="font-semibold text-red-600 hover:underline"
                        onClick={() => void deleteEntry(e.id)}
                      >
                        Sil
                      </button>
                      <button
                        className="text-zinc-400 hover:underline"
                        onClick={() => setDeleteId(null)}
                      >
                        Vazgeç
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Yeni fatura formu */}
      <div className="admin-card admin-card-pad">
        <h3 className="mb-4 font-semibold text-zinc-800">Fatura Ekle</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Fatura Türü</label>
            <select
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              value={form.direction}
              onChange={(e) =>
                setForm((f) => ({ ...f, direction: e.target.value as InvoiceDirection }))
              }
            >
              <option value="outgoing">📤 Kesilen (Satış Faturası)</option>
              <option value="incoming">📥 Gelen (Alış / Gider Faturası)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Fatura Tarihi</label>
            <input
              type="date"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              value={form.invoiceDate}
              onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Matrah / Net Tutar (TL)
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              placeholder="0,00"
              value={form.netTl}
              onChange={(e) => setForm((f) => ({ ...f, netTl: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">KDV Oranı</label>
            <select
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              value={form.kdvRate}
              onChange={(e) =>
                setForm((f) => ({ ...f, kdvRate: parseInt(e.target.value) as KdvRate }))
              }
            >
              {KDV_RATES.map((r) => (
                <option key={r} value={r}>
                  %{r} — {KDV_RATE_LABELS[r].split("—")[1]?.trim()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Karşı Taraf (isteğe bağlı)
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              placeholder="Müşteri / Tedarikçi adı"
              value={form.counterparty}
              onChange={(e) => setForm((f) => ({ ...f, counterparty: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Fatura No (isteğe bağlı)
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              placeholder="2026/001"
              value={form.invoiceNo}
              onChange={(e) => setForm((f) => ({ ...f, invoiceNo: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Açıklama (isteğe bağlı)
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              placeholder="Ürün / hizmet açıklaması"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          {/* KDV önizleme */}
          <div className="flex flex-col justify-end">
            {form.netTl && (
              <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm">
                <span className="text-zinc-500">KDV tutarı: </span>
                <span className="font-bold text-zinc-800">{fmt(computedKdvMinor)}</span>
                <br />
                <span className="text-zinc-500">Toplam: </span>
                <span className="font-bold text-zinc-800">
                  {fmt(tlToMinorLocal(form.netTl) + computedKdvMinor)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={() => void submit()}
            disabled={saving || !form.netTl || !form.invoiceDate}
          >
            {saving ? "Kaydediliyor…" : "Fatura Ekle"}
          </button>
          <button
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            onClick={() => setForm(emptyForm())}
          >
            Temizle
          </button>
        </div>
      </div>

      {/* Gelir vergisi uyarısı */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <div className="mb-2 font-semibold">💡 Gelir Vergisi İçin Not</div>
        <p className="text-xs">
          Yıllık net kazanç tahmininiz <strong>{fmt(yearSummary.netKazan)}</strong> olarak
          hesaplanıyor. Bu tutar <em>tahmini</em> olup; amortismanlar, özel giderler ve diğer yasal
          indirimler uygulandıktan sonra gerçek matrah değişebilir. Geçici ve yıllık gelir vergisi
          hesabı için beyanname takip sayfasını kullanın.
        </p>
      </div>
    </div>
  );
}
