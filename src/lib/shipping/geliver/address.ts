import "server-only";

import type { GeliverClient } from "@geliver/sdk";
import { parseShippingAddress } from "@/lib/admin/shipping-label";
import { resolveTrCityCode } from "@/lib/tr-address";
import type { ResolvedGeliverConfig } from "@/lib/shipping/geliver/settings";
import type { SiteSettings } from "@/lib/site-settings";

function normalizePhone(phone: string | null | undefined): string {
  const raw = String(phone ?? "").replace(/\s/g, "");
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  if (raw.startsWith("0")) return `+9${raw}`;
  if (raw.startsWith("90")) return `+${raw}`;
  return `+90${raw}`;
}

export function buildGeliverRecipientFromOrder(order: {
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddressJson: string | null;
}) {
  const addr = parseShippingAddress(order.shippingAddressJson);
  const cityName = addr.city?.trim() || "";
  const districtName = addr.district?.trim() || "";
  const cityCode = resolveTrCityCode(cityName) ?? "34";
  const line1 = [addr.line1, addr.line2].filter(Boolean).join(" ").trim();
  const phone = normalizePhone(order.customerPhone);
  if (!order.customerName?.trim()) throw new Error("Müşteri adı eksik");
  if (!line1) throw new Error("Teslimat adresi eksik");
  if (!cityName) throw new Error("Şehir bilgisi eksik");
  if (!districtName) throw new Error("İlçe bilgisi eksik");
  if (!phone) throw new Error("Müşteri telefonu eksik");

  return {
    name: order.customerName.trim(),
    email: order.customerEmail?.trim() || undefined,
    address1: line1,
    countryCode: "TR" as const,
    cityName,
    cityCode,
    districtName,
    phone,
    zip: addr.postalCode?.trim() || undefined,
  };
}

export async function ensureGeliverSenderAddress(
  client: GeliverClient,
  settings: SiteSettings,
  config: ResolvedGeliverConfig,
): Promise<string> {
  if (config.senderAddressId) return config.senderAddressId;
  const shipFrom = settings.store?.shipFrom;
  if (!shipFrom?.name?.trim() || !shipFrom.line1?.trim()) {
    throw new Error("Mağaza gönderici adresi eksik — Ayarlar → Mağaza → Kargo gönderici adresi");
  }
  const cityName = shipFrom.city?.trim() || "";
  const districtName = shipFrom.district?.trim() || "";
  const cityCode = resolveTrCityCode(cityName) ?? "34";
  const phone = normalizePhone(shipFrom.phone);
  if (!phone) throw new Error("Gönderici telefonu eksik");
  if (!districtName) throw new Error("Gönderici ilçe eksik");
  if (!shipFrom.postalCode?.trim()) throw new Error("Gönderici posta kodu eksik");

  const sender = await client.addresses.createSender({
    name: shipFrom.name.trim(),
    email: settings.notifications?.email?.fromEmail?.trim() || "noreply@localhost",
    address1: shipFrom.line1.trim(),
    address2: shipFrom.line2?.trim() || undefined,
    countryCode: "TR",
    cityName,
    cityCode,
    districtName,
    phone,
    zip: shipFrom.postalCode.trim(),
    shortName: "Magaza",
  });
  if (!sender.id) throw new Error("Geliver gönderici adresi oluşturulamadı");
  return sender.id;
}
