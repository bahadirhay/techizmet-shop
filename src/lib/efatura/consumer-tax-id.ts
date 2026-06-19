/** Tüketici TCKN/VKN — GİB e-Arşiv için 11 haneli TCKN tamamlama */

const DEFAULT_TCKN = "11111111111";

/** Yalnızca rakam; en fazla 11 hane (giriş alanı) */
export function formatTaxIdInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/**
 * Boş veya eksik TCKN → sağdan 1 ile 11 haneye tamamlar.
 * 10 hane → VKN (şirket) olduğu gibi bırakılır.
 */
export function normalizeConsumerTaxId(
  raw: string | null | undefined,
  fallback = DEFAULT_TCKN,
): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11) return digits;
  if (digits.length > 0 && digits.length < 11) {
    return digits.padEnd(11, "1");
  }
  const fb = fallback.replace(/\D/g, "");
  if (fb.length === 10) return fb;
  if (fb.length === 11) return fb;
  if (fb.length > 0 && fb.length < 11) return fb.padEnd(11, "1");
  return DEFAULT_TCKN;
}

export function isLikelyVkn(taxId: string): boolean {
  const d = taxId.replace(/\D/g, "");
  return d.length === 10;
}
