"use client";

import { useCallback, useMemo, useState } from "react";
import { btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { formatTry, tryToMinor } from "@/lib/admin/money";
import {
  calcProgressiveIncomeTax,
  TAX_TYPE_LABELS,
  type IncomeBracket,
  type TaxConfig,
  type TaxObligationType,
} from "@/lib/finance/tax";

// ── types ──────────────────────────────────────────────────────────────────────
type Obligation = {
  id: string;
  year: number;
  type: TaxObligationType;
  periodKey: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: "bekliyor" | "beyan_edildi" | "odendi";
  baseMinor: number;
  taxMinor: number;
  stampDutyMinor: number;
  paidMinor: number;
  calcJson: string | null;
  notes: string | null;
  declaredAt: string | null;
  paidAt: string | null;
};

type YearInvoiceSummary = {
  outgoingNet: number;
  outgoingKdv: number;
  incomingNet: number;
  incomingKdv: number;
  totalEntries: number;
};

type KdvCalc = {
  hesaplananKdv?: number;
  indirilecekKdv?: number;
  netKdv?: number;
  outgoingNet?: number;
  incomingNet?: number;
};

type GeciciCalc = {
  outgoingNet?: number;
  incomingNet?: number;
  baseMinor?: number;
  baseTL?: number;
  taxTL?: number;
  effectiveRate?: number;
  quarter?: number;
};

const STATUS_LABELS: Record<Obligation["status"], string> = {
  bekliyor: "Bekliyor",
  beyan_edildi: "Beyan Edildi",
  odendi: "Ödendi",
};

const dateFmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
const numFmt = new Intl.NumberFormat("tr-TR");

function fmtDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

function fmtTL(minor: number): string {
  return formatTry(minor);
}

function daysUntil(iso: string): number {
  const d = new Date(iso);
  const today = new Date();
  const a = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const b = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((a - b) / 86400000);
}

function parseCalcJson<T>(json: string | null): T | null {
  if (!json) return null;
  try { return JSON.parse(json) as T; } catch { return null; }
}

// ── main component ─────────────────────────────────────────────────────────────
export function BeyannameManager({
  initialYear,
  initialObligations,
  initialConfig,
  yearInvoiceSummary,
}: {
  initialYear: number;
  initialObligations: Obligation[];
  initialConfig: TaxConfig;
  yearInvoiceSummary: YearInvoiceSummary;
}) {
  const [year, setYear] = useState(initialYear);
  const [obligations, setObligations] = useState<Obligation[]>(initialObligations);
  const [config, setConfig] = useState<TaxConfig>(initialConfig);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const setFlash = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 3500);
  }, []);

  const loadYear = useCallback(async (y: number) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/finance/tax?year=${y}`);
      const data = (await r.json()) as { obligations?: Obligation[]; config?: TaxConfig };
      setObligations(data.obligations ?? []);
      if (data.config) setConfig(data.config);
      setYear(y);
    } finally {
      setBusy(false);
    }
  }, []);

  const generate = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/finance/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      const data = (await r.json()) as { obligations?: Obligation[]; created?: number };
      setObligations(data.obligations ?? []);
      setFlash(
        (data.created ?? 0) > 0
          ? `${data.created} beyanname oluşturuldu.`
          : "Bu yıl için tüm beyannameler zaten mevcut.",
      );
    } finally {
      setBusy(false);
    }
  }, [year, setFlash]);

  const patchObligation = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const r = await fetch(`/api/admin/finance/tax/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) { setFlash("Güncelleme başarısız."); return; }
      const data = (await r.json()) as { obligation?: Obligation };
      const updated = data.obligation;
      if (updated) {
        setObligations((prev) =>
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  ...updated,
                  dueDate:
                    typeof updated.dueDate === "string"
                      ? updated.dueDate
                      : new Date(updated.dueDate).toISOString(),
                }
              : o,
          ),
        );
      }
    },
    [setFlash],
  );

  const removeObligation = useCallback(async (id: string) => {
    if (!window.confirm("Bu beyanname kaydını silmek istediğinize emin misiniz?")) return;
    const r = await fetch(`/api/admin/finance/tax/${id}`, { method: "DELETE" });
    if (r.ok) setObligations((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const summary = useMemo(() => {
    let pending = 0, overdue = 0, taxTotal = 0, paidTotal = 0;
    const now = Date.now();
    for (const o of obligations) {
      taxTotal += o.taxMinor + o.stampDutyMinor;
      paidTotal += o.paidMinor;
      if (o.status !== "odendi") {
        pending++;
        if (new Date(o.dueDate).getTime() < now) overdue++;
      }
    }
    return { count: obligations.length, pending, overdue, taxTotal, paidTotal };
  }, [obligations]);

  // Yaklaşan / geciken beyannameler (30 gün içinde veya geçmiş, ödenmemiş)
  const upcoming = useMemo(() => {
    return obligations
      .filter((o) => o.status !== "odendi" && daysUntil(o.dueDate) <= 30)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [obligations]);

  const years = useMemo(() => {
    const current = new Date().getUTCFullYear();
    return [current - 1, current, current + 1];
  }, []);

  // Yıllık gelir vergisi tahmini
  const netKazancTL = (yearInvoiceSummary.outgoingNet - yearInvoiceSummary.incomingNet) / 100;
  const gelirVergisi = useMemo(
    () => (netKazancTL > 0 ? calcProgressiveIncomeTax(netKazancTL, config.incomeBrackets) : null),
    [netKazancTL, config.incomeBrackets],
  );

  return (
    <div className="space-y-6">
      {msg ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </div>
      ) : null}

      {/* ─── Şirket Profili ─── */}
      <CompanyProfileEditor config={config} onSaved={(c) => { setConfig(c); setFlash("Şirket bilgileri kaydedildi."); }} />

      {/* ─── Yaklaşan Beyannameler ─── */}
      {upcoming.length > 0 && (
        <div className="admin-card admin-card-pad space-y-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-800">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {upcoming.length} bekliyor
            </span>
            Yaklaşan &amp; Geciken Beyannameler
          </h3>
          <div className="space-y-2">
            {upcoming.map((o) => {
              const d = daysUntil(o.dueDate);
              const overdue = d < 0;
              const urgent = !overdue && d <= 7;
              const kdvCalc = o.type === "kdv" ? parseCalcJson<KdvCalc>(o.calcJson) : null;
              const total = o.taxMinor + o.stampDutyMinor;
              return (
                <div
                  key={o.id}
                  className={`rounded-xl border px-4 py-3 ${
                    overdue
                      ? "border-red-200 bg-red-50"
                      : urgent
                      ? "border-amber-200 bg-amber-50"
                      : "border-blue-100 bg-blue-50/50"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-800">{TAX_TYPE_LABELS[o.type]}</span>
                        <span className="text-sm text-zinc-500">{o.periodLabel}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            overdue
                              ? "bg-red-200 text-red-800"
                              : urgent
                              ? "bg-amber-200 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {overdue ? `${Math.abs(d)} gün geçti!` : d === 0 ? "Bugün son gün!" : `${d} gün kaldı`}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">Son tarih: {fmtDate(o.dueDate)}</div>
                      {/* KDV detay */}
                      {kdvCalc && (kdvCalc.hesaplananKdv ?? 0) > 0 && (
                        <div className="mt-2 flex flex-wrap gap-3 text-xs">
                          <span className="text-zinc-600">
                            Hesaplanan KDV: <strong className="text-blue-700">{fmtTL(kdvCalc.hesaplananKdv ?? 0)}</strong>
                          </span>
                          <span className="text-zinc-600">
                            İndirilecek KDV: <strong>{fmtTL(kdvCalc.indirilecekKdv ?? 0)}</strong>
                          </span>
                          <span className="text-zinc-600">
                            Net KDV: <strong className={kdvCalc.netKdv! > 0 ? "text-red-700" : "text-emerald-700"}>
                              {fmtTL(Math.abs(kdvCalc.netKdv ?? 0))}{kdvCalc.netKdv! < 0 ? " (Devreden)" : ""}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="text-xs text-zinc-500">Vergi + Damga</div>
                        <div className="text-lg font-bold text-zinc-900">{fmtTL(total)}</div>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href="https://ivd.gib.gov.tr"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          GİB İVD&apos;ye Git →
                        </a>
                        <select
                          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs"
                          value={o.status}
                          onChange={(e) => void patchObligation(o.id, { status: e.target.value })}
                        >
                          {(Object.keys(STATUS_LABELS) as Obligation["status"][]).map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">
            <strong>GİB İnteraktif Vergi Dairesi (ivd.gib.gov.tr)</strong> üzerinden e-imza veya şifre ile
            beyanname verin. Ödeme sonrası yukarıdaki listeden &quot;Ödendi&quot; olarak işaretleyin.
          </div>
        </div>
      )}

      {/* ─── Özet kartları ─── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryCard label="Toplam Beyanname" value={String(summary.count)} />
        <SummaryCard label="Bekleyen" value={String(summary.pending)} tone="amber" />
        <SummaryCard label="Geciken" value={String(summary.overdue)} tone={summary.overdue > 0 ? "red" : "zinc"} />
        <SummaryCard label="Vergi + Damga (yıl)" value={fmtTL(summary.taxTotal)} />
        <SummaryCard label="Ödenen" value={fmtTL(summary.paidTotal)} tone="emerald" />
      </div>

      {/* ─── Yıllık fatura özeti ─── */}
      {yearInvoiceSummary.totalEntries > 0 && (
        <div className="admin-card admin-card-pad">
          <h3 className="mb-3 text-sm font-semibold text-zinc-800">
            {year} Yılı Fatura Özeti ({yearInvoiceSummary.totalEntries} kayıt)
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <div className="text-xs text-zinc-500">Toplam Satış (KDV hariç)</div>
              <div className="text-base font-bold text-blue-700">{fmtTL(yearInvoiceSummary.outgoingNet)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Toplam Alış/Gider (KDV hariç)</div>
              <div className="text-base font-bold text-zinc-700">{fmtTL(yearInvoiceSummary.incomingNet)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Tahmini Net Kazanç</div>
              <div className="text-base font-bold text-emerald-700">
                {fmtTL(yearInvoiceSummary.outgoingNet - yearInvoiceSummary.incomingNet)}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Hesaplanan KDV (satış)</div>
              <div className="text-base font-bold text-red-700">{fmtTL(yearInvoiceSummary.outgoingKdv)}</div>
            </div>
          </div>
          {gelirVergisi && netKazancTL > 0 && (
            <div className="mt-3 border-t border-zinc-100 pt-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-zinc-600">
                  Tahmini yıllık gelir vergisi:{" "}
                  <strong className="text-red-700">{numFmt.format(Math.round(gelirVergisi.tax))} TL</strong>
                </span>
                <span className="text-zinc-500 text-xs">
                  Efektif oran: %{gelirVergisi.effectiveRate.toFixed(1)} · Matrah: {numFmt.format(Math.round(netKazancTL))} TL
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Bu tahminidir; amortismanlar ve yasal indirimler uygulandığında değişebilir.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Yıl seçici + oluştur ─── */}
      <div className="admin-card admin-card-pad flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-zinc-700">Vergi yılı</label>
        <select
          className={`${inputClass} w-32`}
          value={year}
          onChange={(e) => void loadYear(parseInt(e.target.value, 10))}
          disabled={busy}
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button className={btnPrimary} onClick={() => void generate()} disabled={busy}>
          {busy ? "İşleniyor…" : `${year} Beyanname Takvimini Oluştur`}
        </button>
        <p className="text-xs text-zinc-500">
          {config.openingDate
            ? `Açılış tarihi (${new Date(config.openingDate).toLocaleDateString("tr-TR")}) sonrası dönemler oluşturulur.`
            : "Açılış tarihi girilmemişse yılın tüm beyannameleri oluşturulur."}
        </p>
      </div>

      {/* ─── Gelir vergisi hesaplayıcı ─── */}
      <IncomeTaxCalculator config={config} />

      {/* ─── Beyanname tablosu ─── */}
      <div className="admin-card admin-card-pad">
        <h3 className="mb-3 text-base font-semibold text-zinc-800">{year} Beyanname Takvimi</h3>
        {obligations.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Henüz beyanname yok. Yukarıdan &quot;{year} Beyanname Takvimini Oluştur&quot; butonuna basın.
          </p>
        ) : (
          <ObligationTable
            obligations={obligations}
            config={config}
            onPatch={patchObligation}
            onRemove={removeObligation}
          />
        )}
      </div>

      {/* ─── Vergi ayarları ─── */}
      <TaxSettingsEditor
        config={config}
        onSaved={(c) => { setConfig(c); setFlash("Vergi ayarları kaydedildi."); }}
      />

      {/* ─── Bilgi paneli ─── */}
      <div className="admin-card admin-card-pad space-y-4 text-sm">
        <h3 className="text-base font-semibold text-zinc-800">Vergi Yükümlülükleri Hakkında</h3>
        <ul className="space-y-1 text-zinc-600">
          <li>• <strong>Her ay:</strong> KDV beyannamesi — izleyen ayın 28'i <span className="text-zinc-400">(834,50 TL damga vergisi)</span></li>
          <li>• <strong>3 ayda bir:</strong> Muhtasar beyannamesi — dönem sonu izleyen ay 26 <span className="text-zinc-400">(991 TL damga vergisi)</span></li>
          <li>• <strong>3 ayda bir:</strong> Geçici vergi beyannamesi — dönemi izleyen 2. ay 17 <span className="text-zinc-400">(1.145 TL damga vergisi)</span></li>
          <li>• <strong>Yılda bir:</strong> Yıllık gelir vergisi — izleyen yıl Mart sonu <span className="text-zinc-400">(1.719,84 TL damga vergisi)</span></li>
        </ul>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <p className="font-semibold mb-1">GİB İnteraktif Vergi Dairesi</p>
          <p className="text-xs">
            Beyannameler <strong>ivd.gib.gov.tr</strong> üzerinden e-imza veya şifre ile gönderilir.
            GİB&apos;in kamuya açık beyanname API&apos;si yoktur; Paraşüt/Logo gibi yazılımlar özel anlaşmayla entegre çalışır.
            Tutarları bu panelden hesaplayıp GİB&apos;e kendiniz girin, ödeme yapın, ardından &quot;Ödendi&quot; olarak işaretleyin.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── SummaryCard ────────────────────────────────────────────────────────────────
function SummaryCard({ label, value, tone = "zinc" }: { label: string; value: string; tone?: "zinc" | "amber" | "red" | "emerald" }) {
  const cls: Record<string, string> = { zinc: "text-zinc-900", amber: "text-amber-600", red: "text-red-600", emerald: "text-emerald-600" };
  return (
    <div className="admin-card admin-card-pad">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${cls[tone]}`}>{value}</div>
    </div>
  );
}

// ── DueBadge ───────────────────────────────────────────────────────────────────
function DueBadge({ iso, paid }: { iso: string; paid: boolean }) {
  if (paid) return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{fmtDate(iso)}</span>;
  const d = daysUntil(iso);
  let cls = "bg-zinc-100 text-zinc-600";
  let suffix = "";
  if (d < 0) { cls = "bg-red-100 text-red-700"; suffix = ` · ${Math.abs(d)} gün geçti`; }
  else if (d <= 7) { cls = "bg-amber-100 text-amber-700"; suffix = d === 0 ? " · bugün" : ` · ${d} gün`; }
  else if (d <= 30) { cls = "bg-blue-50 text-blue-700"; suffix = ` · ${d} gün`; }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{fmtDate(iso)}{suffix}</span>;
}

// ── ObligationTable ────────────────────────────────────────────────────────────
function ObligationTable({ obligations, config, onPatch, onRemove }: {
  obligations: Obligation[];
  config: TaxConfig;
  onPatch: (id: string, patch: Record<string, unknown>) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500">
            <th className="py-2 pr-3">Tür</th>
            <th className="py-2 pr-3">Dönem</th>
            <th className="py-2 pr-3">Son Tarih</th>
            <th className="py-2 pr-3 text-right">Matrah</th>
            <th className="py-2 pr-3 text-right">Vergi</th>
            <th className="py-2 pr-3 text-right">Damga</th>
            <th className="py-2 pr-3 text-right">Toplam</th>
            <th className="py-2 pr-3">Durum</th>
            <th className="py-2 pr-3"></th>
          </tr>
        </thead>
        <tbody>
          {obligations.map((o) => (
            <ObligationRow
              key={o.id}
              o={o}
              config={config}
              editing={editId === o.id}
              onToggleEdit={() => setEditId((cur) => (cur === o.id ? null : o.id))}
              onPatch={onPatch}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── ObligationRow ──────────────────────────────────────────────────────────────
function ObligationRow({ o, config, editing, onToggleEdit, onPatch, onRemove }: {
  o: Obligation;
  config: TaxConfig;
  editing: boolean;
  onToggleEdit: () => void;
  onPatch: (id: string, patch: Record<string, unknown>) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
}) {
  const [base, setBase] = useState((o.baseMinor / 100).toString());
  const [tax, setTax] = useState((o.taxMinor / 100).toString());
  const [stamp, setStamp] = useState((o.stampDutyMinor / 100).toString());
  const [paid, setPaid] = useState((o.paidMinor / 100).toString());
  const [notes, setNotes] = useState(o.notes ?? "");
  const [saving, setSaving] = useState(false);

  const isIncomeType = o.type === "gecici" || o.type === "yillik_gelir";
  const total = o.taxMinor + o.stampDutyMinor;

  const kdvCalc = o.type === "kdv" ? parseCalcJson<KdvCalc>(o.calcJson) : null;
  const geciciCalc = o.type === "gecici" ? parseCalcJson<GeciciCalc>(o.calcJson) : null;

  async function save() {
    setSaving(true);
    try {
      await onPatch(o.id, {
        baseMinor: tryToMinor(base),
        taxMinor: tryToMinor(tax),
        stampDutyMinor: tryToMinor(stamp),
        paidMinor: tryToMinor(paid),
        notes: notes.trim() || null,
      });
      onToggleEdit();
    } finally { setSaving(false); }
  }

  function autoCalc() {
    const baseTL = parseFloat(base.replace(",", ".")) || 0;
    const { tax: t } = calcProgressiveIncomeTax(baseTL, config.incomeBrackets);
    setTax(t.toFixed(2));
  }

  return (
    <>
      <tr className="border-b border-zinc-100 align-middle">
        <td className="py-2 pr-3 font-medium text-zinc-800">{TAX_TYPE_LABELS[o.type]}</td>
        <td className="py-2 pr-3 text-zinc-600">
          <div>{o.periodLabel}</div>
          {/* KDV satır özeti */}
          {kdvCalc && (kdvCalc.hesaplananKdv ?? 0) > 0 && (
            <div className="text-xs text-zinc-400">
              Hes: {fmtTL(kdvCalc.hesaplananKdv ?? 0)} / İnd: {fmtTL(kdvCalc.indirilecekKdv ?? 0)}
            </div>
          )}
          {/* Geçici vergi matrahı */}
          {geciciCalc && (geciciCalc.baseTL ?? 0) > 0 && (
            <div className="text-xs text-zinc-400">
              Matrah: {numFmt.format(Math.round(geciciCalc.baseTL ?? 0))} TL · %{geciciCalc.effectiveRate?.toFixed(1)}
            </div>
          )}
        </td>
        <td className="py-2 pr-3">
          <DueBadge iso={o.dueDate} paid={o.status === "odendi"} />
        </td>
        <td className="py-2 pr-3 text-right tabular-nums text-zinc-600">
          {o.baseMinor ? fmtTL(o.baseMinor) : "—"}
        </td>
        <td className="py-2 pr-3 text-right tabular-nums text-zinc-800">{fmtTL(o.taxMinor)}</td>
        <td className="py-2 pr-3 text-right tabular-nums text-zinc-600">{fmtTL(o.stampDutyMinor)}</td>
        <td className="py-2 pr-3 text-right tabular-nums font-semibold text-zinc-900">{fmtTL(total)}</td>
        <td className="py-2 pr-3">
          <select
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
            value={o.status}
            onChange={(e) => void onPatch(o.id, { status: e.target.value })}
          >
            {(Object.keys(STATUS_LABELS) as Obligation["status"][]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </td>
        <td className="py-2 pr-3 text-right whitespace-nowrap">
          <a
            href="https://ivd.gib.gov.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="mr-2 text-xs text-blue-600 hover:underline"
          >
            GİB
          </a>
          <button className="text-xs text-blue-600 hover:underline" onClick={onToggleEdit}>
            {editing ? "Kapat" : "Düzenle"}
          </button>
          <button className="ml-2 text-xs text-red-500 hover:underline" onClick={() => void onRemove(o.id)}>
            Sil
          </button>
        </td>
      </tr>
      {editing ? (
        <tr className="border-b border-zinc-100 bg-zinc-50/60">
          <td colSpan={9} className="px-3 py-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <LabeledInput label="Matrah (TL)" value={base} onChange={setBase} disabled={!isIncomeType} />
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Vergi (TL)</label>
                <div className="flex gap-1">
                  <input className={inputClass} value={tax} onChange={(e) => setTax(e.target.value)} />
                  {isIncomeType ? (
                    <button type="button" className={`${btnSecondary} whitespace-nowrap px-2`} onClick={autoCalc} title="Gelir vergisi dilimlerine göre hesapla">
                      Hesapla
                    </button>
                  ) : null}
                </div>
              </div>
              <LabeledInput label="Damga vergisi (TL)" value={stamp} onChange={setStamp} />
              <LabeledInput label="Ödenen (TL)" value={paid} onChange={setPaid} />
              <LabeledInput label="Not" value={notes} onChange={setNotes} />
            </div>
            {o.type === "gecici" ? (
              <p className="mt-2 text-xs text-amber-700">
                Geçici vergi kümülatiftir (Ocak → dönem sonu). &quot;Hesapla&quot; brüt vergiyi verir; önceki dönemlerde ödenen geçici vergiyi düşerek net tutarı girin.
              </p>
            ) : null}
            {o.type === "kdv" && kdvCalc ? (
              <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
                Otomatik hesaplanan: Hesaplanan KDV {fmtTL(kdvCalc.hesaplananKdv ?? 0)} − İndirilecek KDV {fmtTL(kdvCalc.indirilecekKdv ?? 0)} = Net {fmtTL(kdvCalc.netKdv ?? 0)}
                {(kdvCalc.netKdv ?? 0) < 0 ? " (Devreden KDV — sonraki aya taşınır)" : " ödenecek"}
              </div>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button className={btnPrimary} onClick={() => void save()} disabled={saving}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
              <button className={btnSecondary} onClick={onToggleEdit}>Vazgeç</button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

// ── LabeledInput ───────────────────────────────────────────────────────────────
function LabeledInput({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-600">{label}</label>
      <input className={inputClass} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ── IncomeTaxCalculator ────────────────────────────────────────────────────────
function IncomeTaxCalculator({ config }: { config: TaxConfig }) {
  const [baseStr, setBaseStr] = useState("");
  const base = parseFloat(baseStr.replace(",", ".")) || 0;
  const result = useMemo(() => calcProgressiveIncomeTax(base, config.incomeBrackets), [base, config.incomeBrackets]);

  return (
    <div className="admin-card admin-card-pad">
      <h3 className="mb-1 text-base font-semibold text-zinc-800">Gelir Vergisi Hesaplayıcı</h3>
      <p className="mb-3 text-xs text-zinc-500">
        Yıllık (veya geçici vergi için kümülatif) matrahı girin; {new Date().getUTCFullYear()} artan oranlı tarifeye göre dilim dilim hesaplar.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Matrah (TL)</label>
          <input className={`${inputClass} w-48`} inputMode="decimal" placeholder="örn. 750000" value={baseStr} onChange={(e) => setBaseStr(e.target.value)} />
        </div>
        <div className="rounded-lg bg-zinc-50 px-4 py-2">
          <div className="text-xs text-zinc-500">Hesaplanan gelir vergisi</div>
          <div className="text-lg font-semibold text-zinc-900">{fmtTL(Math.round(result.tax * 100))}</div>
        </div>
        <div className="rounded-lg bg-zinc-50 px-4 py-2">
          <div className="text-xs text-zinc-500">Efektif oran</div>
          <div className="text-lg font-semibold text-zinc-900">%{result.effectiveRate.toFixed(2)}</div>
        </div>
      </div>
      {base > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="py-1 pr-3">Dilim</th>
                <th className="py-1 pr-3">Oran</th>
                <th className="py-1 pr-3 text-right">Bu dilimdeki matrah</th>
                <th className="py-1 pr-3 text-right">Vergi</th>
              </tr>
            </thead>
            <tbody>
              {result.breakdown.map((b, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td className="py-1 pr-3 text-zinc-600">{numFmt.format(b.from)} – {b.to == null ? "üzeri" : numFmt.format(b.to)} TL</td>
                  <td className="py-1 pr-3 text-zinc-600">%{b.rate}</td>
                  <td className="py-1 pr-3 text-right tabular-nums">{numFmt.format(b.taxablePortion)} TL</td>
                  <td className="py-1 pr-3 text-right tabular-nums">{fmtTL(Math.round(b.tax * 100))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// ── CompanyProfileEditor ───────────────────────────────────────────────────────
function CompanyProfileEditor({ config, onSaved }: { config: TaxConfig; onSaved: (c: TaxConfig) => void }) {
  const [open, setOpen] = useState(!config.openingDate); // açılış tarihi yoksa açık başla
  const [openingDate, setOpeningDate] = useState(config.openingDate ?? "");
  const [vkn, setVkn] = useState(config.vkn ?? "");
  const [vergiDairesi, setVergiDairesi] = useState(config.vergiDairesi ?? "");
  const [faaliyetKodu, setFaaliyetKodu] = useState(config.faaliyetKodu ?? "");
  const [webhookToken, setWebhookToken] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/finance/tax/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingDate: openingDate || undefined,
          vkn: vkn || undefined,
          vergiDairesi: vergiDairesi || undefined,
          faaliyetKodu: faaliyetKodu || undefined,
          ...(webhookToken ? { webhookToken } : {}),
        }),
      });
      const data = (await r.json()) as { config?: TaxConfig };
      if (data.config) onSaved(data.config);
      setOpen(false);
    } finally { setSaving(false); }
  }

  return (
    <div className="admin-card admin-card-pad">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((v) => !v)}>
        <div>
          <span className="text-base font-semibold text-zinc-800">Şirket Profili &amp; Mükellef Bilgileri</span>
          {config.openingDate && !open && (
            <span className="ml-3 text-xs text-zinc-500">
              Açılış: {new Date(config.openingDate).toLocaleDateString("tr-TR")}
              {config.vkn ? ` · VKN: ${config.vkn}` : ""}
              {config.vergiDairesi ? ` · ${config.vergiDairesi}` : ""}
            </span>
          )}
          {!config.openingDate && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Açılış tarihi girilmedi
            </span>
          )}
        </div>
        <span className="text-sm text-zinc-400">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Mükellefiyet Başlangıç Tarihi <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className={inputClass}
              value={openingDate}
              onChange={(e) => setOpeningDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-zinc-400">Vergi dairesine tescil tarihi. Beyanname takvimi bu tarihten itibaren oluşturulur.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Vergi Kimlik Numarası (VKN)</label>
            <input type="text" className={inputClass} placeholder="10 haneli VKN" maxLength={11} value={vkn} onChange={(e) => setVkn(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Vergi Dairesi</label>
            <input type="text" className={inputClass} placeholder="Örn: Kadıköy VD" value={vergiDairesi} onChange={(e) => setVergiDairesi(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Faaliyet Kodu (isteğe bağlı)</label>
            <input type="text" className={inputClass} placeholder="NACE kodu" value={faaliyetKodu} onChange={(e) => setFaaliyetKodu(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Google Sheets Webhook Token{" "}
              <span className="font-normal text-zinc-400">(yeni token girmek mevcut tokenı değiştirir)</span>
            </label>
            <input
              type="text"
              className={inputClass}
              placeholder="Rastgele bir şifre yazın (ör: abc123xyz)"
              value={webhookToken}
              onChange={(e) => setWebhookToken(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4 flex gap-2 border-t border-zinc-100 pt-3">
            <button className={btnPrimary} onClick={() => void save()} disabled={saving}>
              {saving ? "Kaydediliyor…" : "Şirket Bilgilerini Kaydet"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── TaxSettingsEditor ──────────────────────────────────────────────────────────
function TaxSettingsEditor({ config, onSaved }: { config: TaxConfig; onSaved: (c: TaxConfig) => void }) {
  const [open, setOpen] = useState(false);
  const [brackets, setBrackets] = useState<IncomeBracket[]>(config.incomeBrackets);
  const [stampKdv, setStampKdv] = useState(config.stampDuty.kdv.toString());
  const [stampMuhtasar, setStampMuhtasar] = useState(config.stampDuty.muhtasar.toString());
  const [stampGecici, setStampGecici] = useState(config.stampDuty.gecici.toString());
  const [stampYillik, setStampYillik] = useState(config.stampDuty.yillikGelir.toString());
  const [muhtasarPeriod, setMuhtasarPeriod] = useState(config.muhtasarPeriod);
  const [saving, setSaving] = useState(false);

  function updateBracket(i: number, field: "upTo" | "rate", value: string) {
    setBrackets((prev) =>
      prev.map((b, idx) =>
        idx === i
          ? { ...b, [field]: field === "upTo" ? (value.trim() === "" ? null : Number(value.replace(/[.,\s]/g, ""))) : Number(value.replace(",", ".")) }
          : b,
      ),
    );
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/finance/tax/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incomeBrackets: brackets,
          stampDuty: {
            kdv: Number(stampKdv.replace(",", ".")),
            muhtasar: Number(stampMuhtasar.replace(",", ".")),
            gecici: Number(stampGecici.replace(",", ".")),
            yillikGelir: Number(stampYillik.replace(",", ".")),
          },
          muhtasarPeriod,
        }),
      });
      const data = (await r.json()) as { config?: TaxConfig };
      if (data.config) onSaved(data.config);
    } finally { setSaving(false); }
  }

  return (
    <div className="admin-card admin-card-pad">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((v) => !v)}>
        <span className="text-base font-semibold text-zinc-800">Vergi Ayarları (dilimler, damga vergisi)</span>
        <span className="text-sm text-zinc-400">{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div className="mt-4 space-y-5">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-zinc-700">Gelir Vergisi Dilimleri</h4>
            <p className="mb-2 text-xs text-zinc-500">&quot;Üst sınır&quot; bu dilimin bittiği kümülatif matrah (TL). Son dilim için boş bırakın.</p>
            <div className="space-y-2">
              {brackets.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={`${inputClass} w-40`} placeholder="üst sınır (TL)" value={b.upTo == null ? "" : String(b.upTo)} onChange={(e) => updateBracket(i, "upTo", e.target.value)} />
                  <span className="text-sm text-zinc-400">TL&apos;ye kadar</span>
                  <input className={`${inputClass} w-24`} placeholder="oran" value={String(b.rate)} onChange={(e) => updateBracket(i, "rate", e.target.value)} />
                  <span className="text-sm text-zinc-400">%</span>
                  <button className="text-xs text-red-500 hover:underline" onClick={() => setBrackets((p) => p.filter((_, idx) => idx !== i))}>Kaldır</button>
                </div>
              ))}
            </div>
            <button className={`${btnSecondary} mt-2`} onClick={() => setBrackets((p) => [...p, { upTo: null, rate: 0 }])}>+ Dilim ekle</button>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-zinc-700">Beyanname Başına Damga Vergisi (TL)</h4>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <LabeledInput label="KDV" value={stampKdv} onChange={setStampKdv} />
              <LabeledInput label="Muhtasar" value={stampMuhtasar} onChange={setStampMuhtasar} />
              <LabeledInput label="Geçici vergi" value={stampGecici} onChange={setStampGecici} />
              <LabeledInput label="Yıllık gelir" value={stampYillik} onChange={setStampYillik} />
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-zinc-700">Muhtasar Dönemi</h4>
            <select className={`${inputClass} w-64`} value={muhtasarPeriod} onChange={(e) => setMuhtasarPeriod(e.target.value as "monthly" | "quarterly")}>
              <option value="quarterly">3 Aylık (10 ve altı çalışan) — 4 beyanname</option>
              <option value="monthly">Aylık (10+ çalışan) — 12 beyanname</option>
            </select>
          </div>
          <div className="flex gap-2 border-t border-zinc-100 pt-3">
            <button className={btnPrimary} onClick={() => void save()} disabled={saving}>
              {saving ? "Kaydediliyor…" : "Ayarları Kaydet"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
