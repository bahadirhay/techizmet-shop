import type { SiteSettings } from "@/lib/site-settings";

/**
 * Şahıs şirketi (gelir vergisi mükellefi) vergi / beyanname yardımcıları.
 * Saf fonksiyonlardır (prisma yok) — hem sunucu hem istemci tarafında kullanılabilir.
 *
 * Yasal dayanak / kaynak (2026):
 * - GVK md.103 artan oranlı tarife (gelir + geçici vergi matrahı şahıs şirketinde aynı tarife)
 * - 4 geçici vergi dönemi 7566 sayılı Kanun ile 2025'ten itibaren yeniden zorunlu (kümülatif)
 * - KDV: izleyen ayın 28'i · Muhtasar (3 aylık): dönem sonu izleyen ayın 26'sı
 * - Geçici vergi: 3 aylık dönemi izleyen 2. ayın 17'si · Yıllık gelir vergisi: izleyen yıl Mart sonu
 * Hafta sonuna denk gelen son günler ilk iş gününe kaydırılır. Resmî tatiller değişebilir;
 * tarihler panelden düzenlenebilir.
 */

export type TaxObligationType = "kdv" | "muhtasar" | "gecici" | "yillik_gelir";

export type IncomeBracket = { upTo: number | null; rate: number };

export type StampDutyConfig = {
  kdv: number;
  muhtasar: number;
  gecici: number;
  yillikGelir: number;
};

export type TaxConfig = {
  incomeBrackets: IncomeBracket[];
  stampDuty: StampDutyConfig;
  muhtasarPeriod: "monthly" | "quarterly";
};

/** 2026 gelir vergisi dilimleri (GVK md.103) */
export const DEFAULT_INCOME_BRACKETS_2026: IncomeBracket[] = [
  { upTo: 198000, rate: 15 },
  { upTo: 414000, rate: 20 },
  { upTo: 1000000, rate: 27 },
  { upTo: 5390000, rate: 35 },
  { upTo: null, rate: 40 },
];

/** 2026 beyanname başına damga vergisi (TL) */
export const DEFAULT_STAMP_DUTY_2026: StampDutyConfig = {
  kdv: 834.5,
  muhtasar: 991,
  gecici: 1145,
  yillikGelir: 1719.84,
};

export const TAX_TYPE_LABELS: Record<TaxObligationType, string> = {
  kdv: "KDV Beyannamesi",
  muhtasar: "Muhtasar Beyannamesi",
  gecici: "Geçici Vergi Beyannamesi",
  yillik_gelir: "Yıllık Gelir Vergisi",
};

const MONTHS_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/** settings.finance.tax değerlerini varsayılanlarla birleştirip döndürür */
export function getTaxConfig(settings: SiteSettings | null | undefined): TaxConfig {
  const t = settings?.finance?.tax ?? {};
  const brackets =
    Array.isArray(t.incomeBrackets) && t.incomeBrackets.length > 0
      ? t.incomeBrackets
          .map((b) => ({
            upTo: b.upTo === null || b.upTo === undefined ? null : Number(b.upTo),
            rate: Number(b.rate),
          }))
          .filter((b) => Number.isFinite(b.rate) && (b.upTo === null || Number.isFinite(b.upTo)))
      : DEFAULT_INCOME_BRACKETS_2026;
  return {
    incomeBrackets: brackets,
    stampDuty: {
      kdv: numOr(t.stampDuty?.kdv, DEFAULT_STAMP_DUTY_2026.kdv),
      muhtasar: numOr(t.stampDuty?.muhtasar, DEFAULT_STAMP_DUTY_2026.muhtasar),
      gecici: numOr(t.stampDuty?.gecici, DEFAULT_STAMP_DUTY_2026.gecici),
      yillikGelir: numOr(t.stampDuty?.yillikGelir, DEFAULT_STAMP_DUTY_2026.yillikGelir),
    },
    muhtasarPeriod: t.muhtasarPeriod === "monthly" ? "monthly" : "quarterly",
  };
}

function numOr(v: number | undefined | null, fallback: number): number {
  return v != null && Number.isFinite(Number(v)) ? Number(v) : fallback;
}

export type BracketBreakdownRow = {
  from: number;
  to: number | null;
  rate: number;
  taxablePortion: number;
  tax: number;
};

/** Artan oranlı (kümülatif) gelir vergisi hesabı. base = matrah (TL). */
export function calcProgressiveIncomeTax(
  base: number,
  brackets: IncomeBracket[] = DEFAULT_INCOME_BRACKETS_2026,
): { tax: number; breakdown: BracketBreakdownRow[]; effectiveRate: number } {
  const safeBase = Math.max(0, Number(base) || 0);
  let lower = 0;
  let tax = 0;
  const breakdown: BracketBreakdownRow[] = [];
  for (const b of brackets) {
    const upper = b.upTo == null ? Infinity : b.upTo;
    if (safeBase > lower) {
      const portion = Math.min(safeBase, upper) - lower;
      if (portion > 0) {
        const portionTax = (portion * b.rate) / 100;
        tax += portionTax;
        breakdown.push({
          from: lower,
          to: b.upTo,
          rate: b.rate,
          taxablePortion: portion,
          tax: round2(portionTax),
        });
      }
    }
    lower = upper;
    if (safeBase <= upper) break;
  }
  const taxR = round2(tax);
  return {
    tax: taxR,
    breakdown,
    effectiveRate: safeBase > 0 ? round2((taxR / safeBase) * 100) : 0,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toMinor(tl: number): number {
  return Math.round((Number(tl) || 0) * 100);
}

/** Hafta sonuna denk gelen tarihi pazartesiye kaydırır (UTC). */
function rollToBusinessDay(d: Date): Date {
  const out = new Date(d);
  const day = out.getUTCDay(); // 0 = Pazar, 6 = Cumartesi
  if (day === 6) out.setUTCDate(out.getUTCDate() + 2);
  else if (day === 0) out.setUTCDate(out.getUTCDate() + 1);
  return out;
}

function utc(year: number, month1: number, day: number): Date {
  // month1: 1-12
  return new Date(Date.UTC(year, month1 - 1, day, 0, 0, 0));
}

/** Ayın son günü (1-12) */
function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export type ObligationSeed = {
  year: number;
  type: TaxObligationType;
  periodKey: string;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  stampDutyMinor: number;
};

/** Belirtilen yıl için tüm beyanname yükümlülüklerini üretir (varsayılan: 21 adet). */
export function generateYearObligations(year: number, config: TaxConfig): ObligationSeed[] {
  const out: ObligationSeed[] = [];
  const sd = config.stampDuty;

  // --- KDV (aylık) — izleyen ayın 28'i ---
  for (let m = 1; m <= 12; m++) {
    const dueMonth = m === 12 ? 1 : m + 1;
    const dueYear = m === 12 ? year + 1 : year;
    out.push({
      year,
      type: "kdv",
      periodKey: `kdv-${year}-${pad(m)}`,
      periodLabel: `${MONTHS_TR[m - 1]} ${year}`,
      periodStart: utc(year, m, 1),
      periodEnd: utc(year, m, lastDayOfMonth(year, m)),
      dueDate: rollToBusinessDay(utc(dueYear, dueMonth, 28)),
      stampDutyMinor: toMinor(sd.kdv),
    });
  }

  // --- Muhtasar — aylık (izleyen ayın 26'sı) veya 3 aylık (dönem sonu izleyen ayın 26'sı) ---
  if (config.muhtasarPeriod === "monthly") {
    for (let m = 1; m <= 12; m++) {
      const dueMonth = m === 12 ? 1 : m + 1;
      const dueYear = m === 12 ? year + 1 : year;
      out.push({
        year,
        type: "muhtasar",
        periodKey: `muhtasar-${year}-${pad(m)}`,
        periodLabel: `${MONTHS_TR[m - 1]} ${year}`,
        periodStart: utc(year, m, 1),
        periodEnd: utc(year, m, lastDayOfMonth(year, m)),
        dueDate: rollToBusinessDay(utc(dueYear, dueMonth, 26)),
        stampDutyMinor: toMinor(sd.muhtasar),
      });
    }
  } else {
    for (let q = 1; q <= 4; q++) {
      const startMonth = (q - 1) * 3 + 1;
      const endMonth = q * 3;
      const dueMonth = endMonth === 12 ? 1 : endMonth + 1;
      const dueYear = endMonth === 12 ? year + 1 : year;
      out.push({
        year,
        type: "muhtasar",
        periodKey: `muhtasar-${year}-Q${q}`,
        periodLabel: `${q}. Dönem (${MONTHS_TR[startMonth - 1]}-${MONTHS_TR[endMonth - 1]})`,
        periodStart: utc(year, startMonth, 1),
        periodEnd: utc(year, endMonth, lastDayOfMonth(year, endMonth)),
        dueDate: rollToBusinessDay(utc(dueYear, dueMonth, 26)),
        stampDutyMinor: toMinor(sd.muhtasar),
      });
    }
  }

  // --- Geçici vergi (3 aylık, kümülatif: Ocak → dönem sonu) — dönemi izleyen 2. ayın 17'si ---
  for (let q = 1; q <= 4; q++) {
    const endMonth = q * 3;
    const dueMonth = endMonth + 2 > 12 ? endMonth + 2 - 12 : endMonth + 2;
    const dueYear = endMonth + 2 > 12 ? year + 1 : year;
    out.push({
      year,
      type: "gecici",
      periodKey: `gecici-${year}-${q}`,
      periodLabel: `${q}. Dönem (Ocak-${MONTHS_TR[endMonth - 1]})`,
      periodStart: utc(year, 1, 1),
      periodEnd: utc(year, endMonth, lastDayOfMonth(year, endMonth)),
      dueDate: rollToBusinessDay(utc(dueYear, dueMonth, 17)),
      stampDutyMinor: toMinor(sd.gecici),
    });
  }

  // --- Yıllık gelir vergisi — izleyen yıl Mart sonu ---
  out.push({
    year,
    type: "yillik_gelir",
    periodKey: `yillik_gelir-${year}`,
    periodLabel: `${year} Yıllık`,
    periodStart: utc(year, 1, 1),
    periodEnd: utc(year, 12, 31),
    dueDate: rollToBusinessDay(utc(year + 1, 3, 31)),
    stampDutyMinor: toMinor(sd.yillikGelir),
  });

  return out;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
