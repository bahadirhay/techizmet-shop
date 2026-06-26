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

function daysUntil(iso: string): number {
  const d = new Date(iso);
  const today = new Date();
  const a = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const b = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((a - b) / 86400000);
}

export function BeyannameManager({
  initialYear,
  initialObligations,
  initialConfig,
}: {
  initialYear: number;
  initialObligations: Obligation[];
  initialConfig: TaxConfig;
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
      const data = await r.json();
      setObligations(data.obligations ?? []);
      setConfig(data.config ?? config);
      setYear(y);
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/finance/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      const data = await r.json();
      setObligations(data.obligations ?? []);
      setFlash(
        data.created > 0
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
      if (!r.ok) {
        setFlash("Güncelleme başarısız.");
        return;
      }
      const data = await r.json();
      const updated = data.obligation as Obligation;
      setObligations((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                ...updated,
                dueDate:
                  typeof updated.dueDate === "string" ? updated.dueDate : new Date(updated.dueDate).toISOString(),
              }
            : o,
        ),
      );
    },
    [setFlash],
  );

  const removeObligation = useCallback(
    async (id: string) => {
      if (!window.confirm("Bu beyanname kaydını silmek istediğinize emin misiniz?")) return;
      const r = await fetch(`/api/admin/finance/tax/${id}`, { method: "DELETE" });
      if (r.ok) setObligations((prev) => prev.filter((o) => o.id !== id));
    },
    [],
  );

  const summary = useMemo(() => {
    let pending = 0;
    let overdue = 0;
    let taxTotal = 0;
    let paidTotal = 0;
    const now = Date.now();
    for (const o of obligations) {
      taxTotal += o.taxMinor + o.stampDutyMinor;
      paidTotal += o.paidMinor;
      if (o.status !== "odendi") {
        pending += 1;
        if (new Date(o.dueDate).getTime() < now) overdue += 1;
      }
    }
    return { count: obligations.length, pending, overdue, taxTotal, paidTotal };
  }, [obligations]);

  const years = useMemo(() => {
    const current = new Date().getUTCFullYear();
    return [current - 1, current, current + 1];
  }, []);

  return (
    <div className="space-y-6">
      {msg ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {msg}
        </div>
      ) : null}

      {/* Özet kartları */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryCard label="Toplam Beyanname" value={String(summary.count)} />
        <SummaryCard label="Bekleyen" value={String(summary.pending)} tone="amber" />
        <SummaryCard label="Geciken" value={String(summary.overdue)} tone={summary.overdue > 0 ? "red" : "zinc"} />
        <SummaryCard label="Vergi + Damga (yıl)" value={formatTry(summary.taxTotal)} />
        <SummaryCard label="Ödenen" value={formatTry(summary.paidTotal)} tone="emerald" />
      </div>

      {/* Yıl seçici + oluştur */}
      <div className="admin-card admin-card-pad flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-zinc-700">Vergi yılı</label>
        <select
          className={`${inputClass} w-32`}
          value={year}
          onChange={(e) => loadYear(parseInt(e.target.value, 10))}
          disabled={busy}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button className={btnPrimary} onClick={generate} disabled={busy}>
          {busy ? "İşleniyor…" : `${year} Beyanname Takvimini Oluştur`}
        </button>
        <p className="text-xs text-zinc-500">
          Şahıs şirketi için yılda 21 beyanname üretilir (12 KDV + 4 muhtasar + 4 geçici vergi + 1 yıllık gelir).
          Mevcut kayıtlar korunur, yalnızca eksikler eklenir.
        </p>
      </div>

      {/* Hesaplama aracı */}
      <IncomeTaxCalculator config={config} />

      {/* Beyanname tablosu */}
      <div className="admin-card admin-card-pad">
        <h3 className="mb-3 text-base font-semibold text-zinc-800">{year} Beyanname Takvimi</h3>
        {obligations.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Henüz beyanname yok. Yukarıdan “{year} Beyanname Takvimini Oluştur” butonuna basın.
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

      {/* Ayarlar */}
      <TaxSettingsEditor
        config={config}
        onSaved={(c) => {
          setConfig(c);
          setFlash("Vergi ayarları kaydedildi.");
        }}
      />

      {/* Bilgi paneli */}
      <div className="admin-card admin-card-pad space-y-4 text-sm">
        <h3 className="text-base font-semibold text-zinc-800">Vergi Yükümlülükleriniz (Kendiniz Takip Etmelisiniz)</h3>
        <p className="text-zinc-600">
          Şahıs şirketlerinde yılda toplam <strong>21 adet beyanname</strong> düzenlenir:
        </p>
        <ul className="space-y-1 text-zinc-600">
          <li>• <strong>Her ay:</strong> KDV beyannamesi <span className="text-zinc-400">(834,50 TL damga vergisi)</span></li>
          <li>• <strong>3 ayda bir:</strong> Muhtasar beyannamesi <span className="text-zinc-400">(991 TL damga vergisi)</span></li>
          <li>• <strong>3 ayda bir:</strong> Gelir geçici vergi beyannamesi <span className="text-zinc-400">(1.145 TL damga vergisi)</span></li>
          <li>• <strong>Yılda bir:</strong> Gelir vergisi beyannamesi <span className="text-zinc-400">(1.719,84 TL damga vergisi)</span></li>
        </ul>

        <div>
          <h4 className="mb-2 font-semibold text-zinc-700">2026 Gelir Vergisi Dilimleri</h4>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ["198.000 TL'ye kadar", "%15"],
                ["198.000 – 414.000 TL", "%20"],
                ["414.000 – 1.000.000 TL", "%27"],
                ["1.000.000 – 5.390.000 TL", "%35"],
                ["5.390.000 TL üzeri", "%40"],
              ].map(([range, rate]) => (
                <tr key={range} className="border-b border-zinc-100">
                  <td className="py-1.5 pr-4 text-zinc-600">{range}</td>
                  <td className="py-1.5 font-semibold text-zinc-800">{rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <p className="font-semibold mb-1">💡 Kendiniz Yaparken Dikkat Edilmesi Gerekenler</p>
          <p>
            <strong>Mali müşavir şart mı?</strong> — Yasal olarak zorunlu değil, ancak vergi beyannamelerini kendiniz
            hazırlayıp göndermek oldukça karmaşık olabilir. Beyannameler{" "}
            <strong>GİB İnteraktif Vergi Dairesi</strong> (ivd.gib.gov.tr) üzerinden e-imza veya şifre ile gönderilebilir.
            Vergi cezaları ve gecikme faizleri yüksek olduğundan son tarihleri kaçırmamaya özen gösterin.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: string;
  tone?: "zinc" | "amber" | "red" | "emerald";
}) {
  const toneMap: Record<string, string> = {
    zinc: "text-zinc-900",
    amber: "text-amber-600",
    red: "text-red-600",
    emerald: "text-emerald-600",
  };
  return (
    <div className="admin-card admin-card-pad">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${toneMap[tone]}`}>{value}</div>
    </div>
  );
}

function DueBadge({ iso, paid }: { iso: string; paid: boolean }) {
  if (paid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
        {fmtDate(iso)}
      </span>
    );
  }
  const d = daysUntil(iso);
  let cls = "bg-zinc-100 text-zinc-600";
  let suffix = "";
  if (d < 0) {
    cls = "bg-red-100 text-red-700";
    suffix = ` · ${Math.abs(d)} gün geçti`;
  } else if (d <= 7) {
    cls = "bg-amber-100 text-amber-700";
    suffix = d === 0 ? " · bugün" : ` · ${d} gün kaldı`;
  } else if (d <= 30) {
    cls = "bg-blue-50 text-blue-700";
    suffix = ` · ${d} gün`;
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {fmtDate(iso)}
      {suffix}
    </span>
  );
}

function ObligationTable({
  obligations,
  config,
  onPatch,
  onRemove,
}: {
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

function ObligationRow({
  o,
  config,
  editing,
  onToggleEdit,
  onPatch,
  onRemove,
}: {
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
    } finally {
      setSaving(false);
    }
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
        <td className="py-2 pr-3 text-zinc-600">{o.periodLabel}</td>
        <td className="py-2 pr-3">
          <DueBadge iso={o.dueDate} paid={o.status === "odendi"} />
        </td>
        <td className="py-2 pr-3 text-right tabular-nums text-zinc-600">
          {o.baseMinor ? formatTry(o.baseMinor) : "—"}
        </td>
        <td className="py-2 pr-3 text-right tabular-nums text-zinc-800">{formatTry(o.taxMinor)}</td>
        <td className="py-2 pr-3 text-right tabular-nums text-zinc-600">{formatTry(o.stampDutyMinor)}</td>
        <td className="py-2 pr-3 text-right tabular-nums font-semibold text-zinc-900">{formatTry(total)}</td>
        <td className="py-2 pr-3">
          <select
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
            value={o.status}
            onChange={(e) => onPatch(o.id, { status: e.target.value })}
          >
            {(Object.keys(STATUS_LABELS) as Obligation["status"][]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </td>
        <td className="py-2 pr-3 text-right whitespace-nowrap">
          <button className="text-xs text-blue-600 hover:underline" onClick={onToggleEdit}>
            {editing ? "Kapat" : "Düzenle"}
          </button>
          <button className="ml-2 text-xs text-red-500 hover:underline" onClick={() => onRemove(o.id)}>
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
                    <button
                      type="button"
                      className={`${btnSecondary} whitespace-nowrap px-2`}
                      onClick={autoCalc}
                      title="Matrahtan gelir vergisi dilimlerine göre hesapla"
                    >
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
                Geçici vergi kümülatiftir (Ocak → dönem sonu). “Hesapla” brüt vergiyi verir; önceki dönemlerde ödenen
                geçici vergiyi düşerek net tutarı girin.
              </p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button className={btnPrimary} onClick={save} disabled={saving}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
              <button className={btnSecondary} onClick={onToggleEdit}>
                Vazgeç
              </button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-600">{label}</label>
      <input
        className={inputClass}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function IncomeTaxCalculator({ config }: { config: TaxConfig }) {
  const [baseStr, setBaseStr] = useState("");
  const base = parseFloat(baseStr.replace(",", ".")) || 0;
  const result = useMemo(
    () => calcProgressiveIncomeTax(base, config.incomeBrackets),
    [base, config.incomeBrackets],
  );

  return (
    <div className="admin-card admin-card-pad">
      <h3 className="mb-1 text-base font-semibold text-zinc-800">Gelir Vergisi Hesaplayıcı</h3>
      <p className="mb-3 text-xs text-zinc-500">
        Yıllık (veya geçici vergi için kümülatif) matrahı girin; {new Date().getUTCFullYear()} artan oranlı tarifeye göre
        vergiyi dilim dilim hesaplar.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Matrah (TL)</label>
          <input
            className={`${inputClass} w-48`}
            inputMode="decimal"
            placeholder="örn. 750000"
            value={baseStr}
            onChange={(e) => setBaseStr(e.target.value)}
          />
        </div>
        <div className="rounded-lg bg-zinc-50 px-4 py-2">
          <div className="text-xs text-zinc-500">Hesaplanan gelir vergisi</div>
          <div className="text-lg font-semibold text-zinc-900">{formatTry(Math.round(result.tax * 100))}</div>
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
                  <td className="py-1 pr-3 text-zinc-600">
                    {numFmt.format(b.from)} – {b.to == null ? "üzeri" : numFmt.format(b.to)} TL
                  </td>
                  <td className="py-1 pr-3 text-zinc-600">%{b.rate}</td>
                  <td className="py-1 pr-3 text-right tabular-nums">{numFmt.format(b.taxablePortion)} TL</td>
                  <td className="py-1 pr-3 text-right tabular-nums">{formatTry(Math.round(b.tax * 100))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function TaxSettingsEditor({
  config,
  onSaved,
}: {
  config: TaxConfig;
  onSaved: (c: TaxConfig) => void;
}) {
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
          ? {
              ...b,
              [field]:
                field === "upTo"
                  ? value.trim() === ""
                    ? null
                    : Number(value.replace(/[.,\s]/g, ""))
                  : Number(value.replace(",", ".")),
            }
          : b,
      ),
    );
  }

  function addBracket() {
    setBrackets((prev) => [...prev, { upTo: null, rate: 0 }]);
  }
  function removeBracket(i: number) {
    setBrackets((prev) => prev.filter((_, idx) => idx !== i));
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
      const data = await r.json();
      if (data.config) onSaved(data.config as TaxConfig);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-card admin-card-pad">
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-base font-semibold text-zinc-800">Vergi Ayarları (dilimler, damga vergisi)</span>
        <span className="text-sm text-zinc-400">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="mt-4 space-y-5">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-zinc-700">Gelir Vergisi Dilimleri</h4>
            <p className="mb-2 text-xs text-zinc-500">
              “Üst sınır” bu dilimin bittiği kümülatif matrah (TL). Son dilim için boş bırakın (üzeri).
            </p>
            <div className="space-y-2">
              {brackets.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={`${inputClass} w-40`}
                    placeholder="üst sınır (TL)"
                    value={b.upTo == null ? "" : String(b.upTo)}
                    onChange={(e) => updateBracket(i, "upTo", e.target.value)}
                  />
                  <span className="text-sm text-zinc-400">TL'ye kadar</span>
                  <input
                    className={`${inputClass} w-24`}
                    placeholder="oran"
                    value={String(b.rate)}
                    onChange={(e) => updateBracket(i, "rate", e.target.value)}
                  />
                  <span className="text-sm text-zinc-400">%</span>
                  <button className="text-xs text-red-500 hover:underline" onClick={() => removeBracket(i)}>
                    Kaldır
                  </button>
                </div>
              ))}
            </div>
            <button className={`${btnSecondary} mt-2`} onClick={addBracket}>
              + Dilim ekle
            </button>
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
            <select
              className={`${inputClass} w-64`}
              value={muhtasarPeriod}
              onChange={(e) => setMuhtasarPeriod(e.target.value as "monthly" | "quarterly")}
            >
              <option value="quarterly">3 Aylık (10 ve altı çalışan) — 4 beyanname</option>
              <option value="monthly">Aylık (10+ çalışan) — 12 beyanname</option>
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              Değişiklik sonraki “takvim oluştur” işleminde yeni dönemlere uygulanır.
            </p>
          </div>

          <div className="flex gap-2 border-t border-zinc-100 pt-3">
            <button className={btnPrimary} onClick={save} disabled={saving}>
              {saving ? "Kaydediliyor…" : "Ayarları Kaydet"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
