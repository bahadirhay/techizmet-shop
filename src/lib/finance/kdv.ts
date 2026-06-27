/**
 * Türk KDV (Katma Değer Vergisi) hesaplama yardımcıları
 *
 * Yasal dayanak (2026):
 * - 3065 sayılı KDV Kanunu
 * - KDV oranları: %1 (temel gıda, kitap), %10 (gıda/ilaç/konaklama/sağlık), %20 (genel)
 * - KDV beyannamesi: Takip eden ayın 28'i (elektronik beyan zorunlu)
 * - Ödenecek KDV = Hesaplanan KDV − İndirilecek KDV
 * - Devreden KDV: İndirilecek > Hesaplanan ise fark sonraki aya devredilir (iade yok, mahsup)
 * - Matrah: KDV hariç tutar; KDV = Matrah × Oran / 100
 */

export type InvoiceDirection = "outgoing" | "incoming";

export const KDV_RATES = [1, 10, 20] as const;
export type KdvRate = (typeof KDV_RATES)[number];

export const KDV_RATE_LABELS: Record<KdvRate, string> = {
  1: "%1 — Temel gıda, tarım ürünleri",
  10: "%10 — Gıda, ilaç, konaklama, sağlık",
  20: "%20 — Genel oran",
};

export type InvoiceEntryRow = {
  id: string;
  direction: InvoiceDirection;
  invoiceDate: string; // ISO
  invoiceNo: string | null;
  counterparty: string | null;
  netMinor: number;
  kdvRate: number;
  kdvMinor: number;
  description: string | null;
  createdAt: string;
};

export type MonthlyKdvSummary = {
  year: number;
  month: number; // 1-12
  /** Kesilen (satış) faturalar KDV = Hesaplanan KDV */
  hesaplananKdv: number;
  /** Gelen (alış/gider) faturalar KDV = İndirilecek KDV */
  indirilecekKdv: number;
  /** Önceki aydan devreden KDV */
  devredenKdv: number;
  /** Ödenecek KDV = Hesaplanan − İndirilecek − Devreden (≥0) */
  odenecekKdv: number;
  /** Sonraki aya devreden = Hesaplanan < İndirilecek + Devreden ise fark */
  yeniDevredenKdv: number;
  /** Kesilen fatura KDV hariç toplam (gelir vergisi matrahı için) */
  outgoingNet: number;
  /** Gelen fatura KDV hariç toplam (gider) */
  incomingNet: number;
};

/** Aylık özet hesapla. devredenKdv: önceki aydan taşınan (kuruş) */
export function calcMonthlyKdv(
  entries: InvoiceEntryRow[],
  year: number,
  month: number,
  devredenKdv = 0,
): MonthlyKdvSummary {
  const monthEntries = entries.filter((e) => {
    const d = new Date(e.invoiceDate);
    return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month;
  });

  let hesaplananKdv = 0;
  let indirilecekKdv = 0;
  let outgoingNet = 0;
  let incomingNet = 0;

  for (const e of monthEntries) {
    if (e.direction === "outgoing") {
      hesaplananKdv += e.kdvMinor;
      outgoingNet += e.netMinor;
    } else {
      indirilecekKdv += e.kdvMinor;
      incomingNet += e.netMinor;
    }
  }

  const toplam = hesaplananKdv - indirilecekKdv - devredenKdv;
  const odenecekKdv = Math.max(0, toplam);
  const yeniDevredenKdv = toplam < 0 ? -toplam : 0;

  return {
    year,
    month,
    hesaplananKdv,
    indirilecekKdv,
    devredenKdv,
    odenecekKdv,
    yeniDevredenKdv,
    outgoingNet,
    incomingNet,
  };
}

/** Yıl boyunca aylık KDV özetleri (devreden zinciri ile) */
export function calcYearlyKdv(
  entries: InvoiceEntryRow[],
  year: number,
  initialDevredenKdv = 0,
): MonthlyKdvSummary[] {
  const summaries: MonthlyKdvSummary[] = [];
  let devreden = initialDevredenKdv;
  for (let m = 1; m <= 12; m++) {
    const s = calcMonthlyKdv(entries, year, m, devreden);
    summaries.push(s);
    devreden = s.yeniDevredenKdv;
  }
  return summaries;
}

/** Fatura KDV tutarını hesapla (net × oran / 100, kuruşa yuvarla) */
export function calcKdv(netMinor: number, kdvRate: KdvRate): number {
  return Math.round((netMinor * kdvRate) / 100);
}

/** TL cinsinden tutarı kuruşa çevir */
export function tlToMinor(tl: string | number): number {
  return Math.round(parseFloat(String(tl).replace(",", ".")) * 100);
}

/** Kuruşu TL formatına çevir */
export function minorToTl(minor: number): string {
  return (minor / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
