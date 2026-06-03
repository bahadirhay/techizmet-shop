/** Kargo takip URL — şablonda {tracking} */

export function buildCarrierTrackingUrl(
  template: string | null | undefined,
  trackingNumber: string | null | undefined,
): string | null {
  const tracking = trackingNumber?.trim();
  if (!tracking || !template?.trim()) return null;
  return template.trim().replace(/\{tracking\}/gi, encodeURIComponent(tracking));
}
