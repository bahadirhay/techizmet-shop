/** GA4 ölçüm kimliği — enjeksiyon için güvenli format */
export function safeGoogleAnalyticsId(raw: string | null | undefined): string | null {
  const id = raw?.trim();
  if (!id) return null;
  return /^G-[A-Z0-9]+$/i.test(id) ? id : null;
}
