/** Türkiye'de yaygın KDV oranları (GİB e-Arşiv / KDV Kanunu kapsamı). */
export type TrVatRateOption = {
  rate: number;
  label: string;
  description: string;
};

export const TR_VAT_RATES: readonly TrVatRateOption[] = [
  {
    rate: 20,
    label: "%20 — Genel oran",
    description: "Çoğu mal ve hizmet (kozmetik, elektronik, genel perakende)",
  },
  {
    rate: 10,
    label: "%10 — İndirimli oran",
    description: "Bazı gıda, kitap, sağlık ve eğitim materyalleri, konaklama vb.",
  },
  {
    rate: 1,
    label: "%1 — İlk oran",
    description: "Temel gıda, tarım ürünleri, basılı gazete, bazı konut kiraları vb.",
  },
  {
    rate: 0,
    label: "%0 — İstisna / ihracat",
    description: "İhracat teslimleri ve KDV'den tam istisna işlemler",
  },
] as const;

export const DEFAULT_TR_VAT_RATE = 20;

const ALLOWED_RATES = new Set(TR_VAT_RATES.map((r) => r.rate));

/** Form/API'den gelen değeri geçerli Türkiye KDV oranına çevirir. */
export function normalizeVatRate(value: unknown, fallback = DEFAULT_TR_VAT_RATE): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : parseInt(String(value ?? "").trim(), 10);
  if (ALLOWED_RATES.has(n)) return n;
  return fallback;
}

export function vatRateLabel(rate: number): string {
  return TR_VAT_RATES.find((r) => r.rate === rate)?.label ?? `%${rate}`;
}
