/** shipmentMetaJson içinde kargo/teslim zaman damgaları (şema değişikliği gerektirmez). */

export type OrderShipmentTimestamps = {
  shippedAt?: string | null;
  deliveredAt?: string | null;
};

export function parseShipmentTimestamps(
  shipmentMetaJson: string | null | undefined,
): OrderShipmentTimestamps {
  if (!shipmentMetaJson?.trim()) return {};
  try {
    const raw = JSON.parse(shipmentMetaJson) as Record<string, unknown>;
    return {
      shippedAt: typeof raw.shippedAt === "string" ? raw.shippedAt : null,
      deliveredAt: typeof raw.deliveredAt === "string" ? raw.deliveredAt : null,
    };
  } catch {
    return {};
  }
}

export function mergeShipmentMetaJson(
  shipmentMetaJson: string | null | undefined,
  patch: Record<string, unknown>,
): string {
  let base: Record<string, unknown> = {};
  if (shipmentMetaJson?.trim()) {
    try {
      base = JSON.parse(shipmentMetaJson) as Record<string, unknown>;
    } catch {
      base = {};
    }
  }
  return JSON.stringify({ ...base, ...patch });
}

/** Kargoya verildi anını kaydet (yalnızca ilk kez). */
export function withShippedAt(
  shipmentMetaJson: string | null | undefined,
  at: Date = new Date(),
): string {
  const prev = parseShipmentTimestamps(shipmentMetaJson);
  if (prev.shippedAt) return shipmentMetaJson ?? mergeShipmentMetaJson(null, {});
  return mergeShipmentMetaJson(shipmentMetaJson, { shippedAt: at.toISOString() });
}

/** Teslim edildi anını kaydet. */
export function withDeliveredAt(
  shipmentMetaJson: string | null | undefined,
  at: Date = new Date(),
): string {
  const patch: Record<string, unknown> = { deliveredAt: at.toISOString() };
  const prev = parseShipmentTimestamps(shipmentMetaJson);
  if (!prev.shippedAt) patch.shippedAt = at.toISOString();
  return mergeShipmentMetaJson(shipmentMetaJson, patch);
}

/** Kargoya verilme tarihi — yoksa updatedAt yedek. */
export function resolveShippedAt(
  shipmentMetaJson: string | null | undefined,
  updatedAt: Date,
): Date {
  const { shippedAt } = parseShipmentTimestamps(shipmentMetaJson);
  if (shippedAt) {
    const d = new Date(shippedAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return updatedAt;
}
