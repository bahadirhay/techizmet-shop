import "server-only";

import type { Offer } from "@geliver/sdk";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { createGeliverClient } from "@/lib/shipping/geliver/client";
import {
  formatGeliverProviderLabel,
  geliverCarrierCodeForQuote,
  LEGACY_GELIVER_CARRIER_CODE,
} from "@/lib/shipping/geliver/provider-labels";
import {
  geliverReady,
  geliverShipmentReady,
  resolveGeliverConfig,
} from "@/lib/shipping/geliver/settings";

const QUOTE_CACHE_TTL_MS = 10 * 60 * 1000;
const quoteCache = new Map<string, { expires: number; quotes: GeliverCheckoutQuote[] }>();

const QUOTE_PREVIEW_RECIPIENT = {
  name: "Müşteri",
  email: "musteri@example.com",
  phone: "+905551234567",
  address1: "Merkez Mah.",
  countryCode: "TR",
  cityName: "İstanbul",
  cityCode: "34",
  districtName: "Kadıköy",
  zip: "34000",
};

export type GeliverCheckoutQuote = {
  providerCode: string;
  providerServiceCode: string;
  providerName: string;
  serviceName: string;
  priceMinor: number;
};

function parseTryToMinor(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function offerPriceMinor(offer: Offer): number | null {
  return (
    parseTryToMinor(offer.totalAmountLocal) ??
    parseTryToMinor(offer.amountLocal) ??
    parseTryToMinor(offer.totalAmount) ??
    parseTryToMinor(offer.amount) ??
    parseTryToMinor(offer.providerTotalAmount)
  );
}

function serviceLabel(providerServiceCode: string, offer: Offer): string {
  const human = offer.averageEstimatedTimeHumanReadible?.trim();
  if (human) return human;
  const code = providerServiceCode.trim();
  const suffix = code.includes("_") ? code.split("_").slice(1).join(" ") : code;
  return suffix.replace(/_/g, " ").trim() || "Standart";
}

function deepCollectQuoteRows(node: unknown, out: unknown[], depth = 0): void {
  if (depth > 10 || node == null) return;
  if (Array.isArray(node)) {
    for (const item of node) deepCollectQuoteRows(item, out, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  const hasService = Boolean(o.providerServiceCode ?? o.serviceCode);
  const hasPrice = Boolean(
    o.totalAmountLocal ??
      o.amountLocal ??
      o.totalAmount ??
      o.amount ??
      o.providerTotalAmount ??
      o.price,
  );
  if (hasService && hasPrice) out.push(o);
  for (const value of Object.values(o)) deepCollectQuoteRows(value, out, depth + 1);
}

function extractPriceListItems(raw: unknown): unknown[] {
  const collected: unknown[] = [];
  deepCollectQuoteRows(raw, collected);
  if (collected.length > 0) return collected;

  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.data)) return o.data;
  if (Array.isArray(o.list)) return o.list;
  if (Array.isArray(o.prices)) return o.prices;
  if (Array.isArray(o.priceList)) return o.priceList;
  if (Array.isArray(o.priceQuotes)) return o.priceQuotes;
  if (o.data && typeof o.data === "object") {
    const d = o.data as Record<string, unknown>;
    if (Array.isArray(d.list)) return d.list;
    if (Array.isArray(d.prices)) return d.prices;
    if (Array.isArray(d.priceList)) return d.priceList;
    if (Array.isArray(d.priceQuotes)) return d.priceQuotes;
  }
  return [];
}

function quoteFromRow(row: unknown): GeliverCheckoutQuote | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const providerServiceCode = String(o.providerServiceCode ?? o.serviceCode ?? "").trim();
  const providerCode = String(o.providerCode ?? "").trim();
  if (!providerServiceCode) return null;

  const priceMinor =
    parseTryToMinor(o.totalAmountLocal as string) ??
    parseTryToMinor(o.amountLocal as string) ??
    parseTryToMinor(o.totalAmount as string) ??
    parseTryToMinor(o.amount as string) ??
    parseTryToMinor(o.providerTotalAmount as string) ??
    parseTryToMinor(o.price as string) ??
    offerPriceMinor(o as Offer);
  if (priceMinor == null) return null;

  const providerName = formatGeliverProviderLabel(
    providerCode,
    typeof o.providerAccountName === "string" ? o.providerAccountName : null,
  );

  return {
    providerCode: providerCode || providerServiceCode.split("_")[0] || "KARGO",
    providerServiceCode,
    providerName,
    serviceName: serviceLabel(providerServiceCode, o as Offer),
    priceMinor,
  };
}

function quotesFromOffers(offers: { list?: Offer[]; cheapest?: Offer } | undefined): GeliverCheckoutQuote[] {
  const quotes: GeliverCheckoutQuote[] = [];
  const offerList = offers?.list ?? (offers?.cheapest ? [offers.cheapest] : []);
  for (const offer of offerList) {
    const providerServiceCode = offer.providerServiceCode?.trim();
    if (!providerServiceCode) continue;
    const priceMinor = offerPriceMinor(offer);
    if (priceMinor == null) continue;
    quotes.push({
      providerCode: offer.providerCode?.trim() || providerServiceCode.split("_")[0] || "KARGO",
      providerServiceCode,
      providerName: formatGeliverProviderLabel(offer.providerCode, offer.providerAccountName),
      serviceName: serviceLabel(providerServiceCode, offer),
      priceMinor,
    });
  }
  return quotes;
}

function dedupeQuotes(quotes: GeliverCheckoutQuote[]): GeliverCheckoutQuote[] {
  const byService = new Map<string, GeliverCheckoutQuote>();
  for (const q of quotes) {
    const prev = byService.get(q.providerServiceCode);
    if (!prev || q.priceMinor < prev.priceMinor) byService.set(q.providerServiceCode, q);
  }
  return [...byService.values()].sort((a, b) => a.priceMinor - b.priceMinor);
}

function quoteCacheKey(siteId: string, totalDesi: number, config: ReturnType<typeof resolveGeliverConfig>): string {
  return [
    siteId,
    totalDesi,
    config.parcel.length,
    config.parcel.width,
    config.parcel.height,
    config.parcel.weight,
  ].join(":");
}

async function fetchGeliverCheckoutQuotesViaShipment(
  siteId: string,
  totalDesi: number,
): Promise<GeliverCheckoutQuote[]> {
  const settings = await getSiteSettings(siteId);
  if (!geliverShipmentReady(settings)) return [];

  const config = resolveGeliverConfig(settings);
  const cacheKey = quoteCacheKey(siteId, totalDesi, config);
  const cached = quoteCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.quotes;

  const client = createGeliverClient(config);
  const weight = String(Math.max(0.5, totalDesi));
  let shipmentId: string | undefined;
  try {
    const payload = {
      senderAddressID: config.senderAddressId!,
      recipientAddress: QUOTE_PREVIEW_RECIPIENT,
      length: config.parcel.length,
      width: config.parcel.width,
      height: config.parcel.height,
      distanceUnit: config.parcel.distanceUnit,
      weight,
      massUnit: config.parcel.massUnit,
      order: {
        orderNumber: `quote-${Date.now()}`,
        sourceIdentifier: config.storeUrl,
        totalAmount: "100.00",
        totalAmountCurrency: "TRY",
      },
    } as Parameters<typeof client.shipments.create>[0];
    const created = config.testMode
      ? await client.shipments.createTest(payload)
      : await client.shipments.create(payload);
    shipmentId = created.id;
    if (!shipmentId) return [];

    const shipment = await client.shipments.waitForOffers(shipmentId, {
      intervalMs: 800,
      timeoutMs: 8_000,
    });
    const quotes = dedupeQuotes(
      quotesFromOffers((shipment as { offers?: { list?: Offer[]; cheapest?: Offer } }).offers),
    );
    if (quotes.length > 0) {
      quoteCache.set(cacheKey, { expires: Date.now() + QUOTE_CACHE_TTL_MS, quotes });
    }
    return quotes;
  } finally {
    if (shipmentId) {
      await client.shipments.cancel(shipmentId).catch(() => undefined);
    }
  }
}

export async function fetchGeliverCheckoutQuotes(
  siteId: string,
  totalDesi = 1,
  options?: { shipmentFallback?: boolean },
): Promise<GeliverCheckoutQuote[]> {
  const settings = await getSiteSettings(siteId);
  if (!geliverReady(settings)) return [];

  const config = resolveGeliverConfig(settings);
  if (!config.apiToken) return [];

  const client = createGeliverClient(config);
  const weight = String(Math.max(0.5, totalDesi));
  let quotes: GeliverCheckoutQuote[] = [];

  try {
    const raw = await client.prices.listPrices({
      paramType: "parcel",
      length: config.parcel.length,
      width: config.parcel.width,
      height: config.parcel.height,
      weight,
      distanceUnit: config.parcel.distanceUnit,
      massUnit: config.parcel.massUnit,
    });
    const items = extractPriceListItems(raw);
    quotes = items
      .map((row) => quoteFromRow(row))
      .filter((q): q is GeliverCheckoutQuote => q != null);
    if (quotes.length === 0 && raw && typeof raw === "object") {
      quotes = quotesFromOffers((raw as { offers?: { list?: Offer[]; cheapest?: Offer } }).offers);
    }
  } catch (e) {
    console.error("[geliver] priceList", e);
  }

  quotes = dedupeQuotes(quotes);
  if (quotes.length > 0) return quotes;

  if (options?.shipmentFallback) {
    return fetchGeliverCheckoutQuotesViaShipment(siteId, totalDesi);
  }
  return [];
}

export async function syncGeliverCheckoutQuotes(
  siteId: string,
  totalDesi = 1,
  options?: { shipmentFallback?: boolean },
): Promise<boolean> {
  let quotes: GeliverCheckoutQuote[];
  try {
    quotes = await fetchGeliverCheckoutQuotes(siteId, totalDesi, options);
  } catch (e) {
    console.error("[geliver] checkout quotes", e);
    return false;
  }
  if (quotes.length === 0) return false;

  const activeCodes = new Set<string>();

  for (let i = 0; i < quotes.length; i += 1) {
    const q = quotes[i]!;
    const code = geliverCarrierCodeForQuote(q.providerServiceCode);
    activeCodes.add(code);
    const configJson = JSON.stringify({
      geliver: true,
      providerCode: q.providerCode,
      providerServiceCode: q.providerServiceCode,
    });

    let carrier = await prisma.shippingCarrier.findFirst({
      where: { siteId, code },
      include: { rates: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    });

    if (!carrier) {
      carrier = await prisma.shippingCarrier.create({
        data: {
          siteId,
          code,
          name: q.providerName,
          active: true,
          trackingUrlTemplate: "https://app.geliver.io/tracking/{tracking}",
          notes: "Geliver canlı fiyat",
          configJson,
          sortOrder: i,
        },
        include: { rates: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
      });
    } else {
      await prisma.shippingCarrier.update({
        where: { id: carrier.id },
        data: { name: q.providerName, configJson, sortOrder: i },
      });
    }

    const rate = carrier.rates[0];
    if (rate) {
      if (rate.priceMinor !== q.priceMinor || rate.name !== q.serviceName) {
        await prisma.shippingRate.update({
          where: { id: rate.id },
          data: { priceMinor: q.priceMinor, name: q.serviceName },
        });
      }
    } else {
      await prisma.shippingRate.create({
        data: {
          carrierId: carrier.id,
          name: q.serviceName,
          priceMinor: q.priceMinor,
          active: true,
          sortOrder: 0,
        },
      });
    }
  }

  await prisma.shippingCarrier.updateMany({
    where: {
      siteId,
      code: LEGACY_GELIVER_CARRIER_CODE,
    },
    data: { active: false },
  });

  const stale = await prisma.shippingCarrier.findMany({
    where: {
      siteId,
      code: { startsWith: "geliver:" },
      NOT: { code: { in: [...activeCodes] } },
    },
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.shippingCarrier.updateMany({
      where: { id: { in: stale.map((s) => s.id) } },
      data: { active: false },
    });
  }

  return true;
}

/** Ödeme sayfası — canlı API yok, son senkronize DB tarifeleri */
export async function prepareGeliverCheckoutRates(siteId: string): Promise<void> {
  const settings = await getSiteSettings(siteId);
  if (!geliverReady(settings)) return;

  const liveCount = await prisma.shippingCarrier.count({
    where: { siteId, active: true, code: { startsWith: "geliver:" } },
  });
  if (liveCount > 0) {
    await prisma.shippingCarrier.updateMany({
      where: { siteId, code: LEGACY_GELIVER_CARRIER_CODE },
      data: { active: false },
    });
  }
}

export async function resolveGeliverProviderFromCarrierId(
  carrierId: string | null | undefined,
): Promise<{ providerServiceCode: string | null; providerCode: string | null }> {
  if (!carrierId) return { providerServiceCode: null, providerCode: null };
  const carrier = await prisma.shippingCarrier.findUnique({
    where: { id: carrierId },
    select: { configJson: true, code: true },
  });
  if (!carrier?.configJson) {
    return { providerServiceCode: null, providerCode: null };
  }
  try {
    const cfg = JSON.parse(carrier.configJson) as {
      geliver?: boolean;
      providerServiceCode?: string;
      providerCode?: string;
    };
    if (!cfg.geliver) return { providerServiceCode: null, providerCode: null };
    return {
      providerServiceCode: cfg.providerServiceCode?.trim() || null,
      providerCode: cfg.providerCode?.trim() || null,
    };
  } catch {
    return { providerServiceCode: null, providerCode: null };
  }
}
