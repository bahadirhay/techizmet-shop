export function formatTry(minor: number): string {
  // Türkçe yazım kuralı: sembol sayının sağında (115,00₺)
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
  return `${formatted} ₺`;
}
