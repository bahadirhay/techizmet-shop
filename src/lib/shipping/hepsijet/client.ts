import "server-only";

import type { HepsijetCarrierConfig } from "@/lib/shipping/hepsijet/types";

const PROD_BASE = "https://integration.hepsijet.com";
const TEST_BASE = "https://integration-apitest.hepsijet.com";

type TokenCacheEntry = { token: string; expiresAt: number };
const tokenCache = new Map<string, TokenCacheEntry>();

function baseUrl(testMode: boolean) {
  return testMode ? TEST_BASE : PROD_BASE;
}

function cacheKey(cfg: HepsijetCarrierConfig) {
  return `${cfg.testMode ? "t" : "p"}:${cfg.apiUsername}`;
}

type HepsijetEnvelope<T> = {
  status?: string;
  data?: T;
  message?: string | null;
};

async function parseJson<T>(res: Response): Promise<HepsijetEnvelope<T>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as HepsijetEnvelope<T>;
  } catch {
    throw new Error(text.slice(0, 240) || `HepsiJet HTTP ${res.status}`);
  }
}

export async function hepsijetGetToken(cfg: HepsijetCarrierConfig): Promise<string> {
  const key = cacheKey(cfg);
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const auth = Buffer.from(`${cfg.apiUsername}:${cfg.apiPassword}`).toString("base64");
  const res = await fetch(`${baseUrl(cfg.testMode)}/auth/getToken`, {
    method: "GET",
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    cache: "no-store",
  });
  const json = await parseJson<{ token?: string }>(res);
  if (!res.ok || json.status !== "OK" || !json.data?.token) {
    throw new Error(json.message || `HepsiJet token alınamadı (HTTP ${res.status})`);
  }
  tokenCache.set(key, { token: json.data.token, expiresAt: Date.now() + 55 * 60 * 1000 });
  return json.data.token;
}

export async function hepsijetTestConnection(cfg: HepsijetCarrierConfig): Promise<{ ok: true; testMode: boolean }> {
  await hepsijetGetToken(cfg);
  return { ok: true, testMode: cfg.testMode };
}

export type HepsijetAddressInput = {
  companyAddressId: string;
  addressLine1: string;
  city: string;
  town: string;
  district?: string;
};

export type HepsijetCreateShipmentInput = {
  customerDeliveryNo: string;
  customerOrderId: string;
  desi: number;
  deliveryDate: string;
  receiver: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  recipientAddress: HepsijetAddressInput;
  senderAddress: HepsijetAddressInput;
};

function nestedAddress(addr: HepsijetAddressInput) {
  return {
    companyAddressId: addr.companyAddressId,
    country: { name: "Türkiye" },
    city: { name: addr.city },
    town: { name: addr.town },
    district: { name: addr.district?.trim() || addr.town },
    addressLine1: addr.addressLine1,
  };
}

export async function hepsijetCreateShipment(
  cfg: HepsijetCarrierConfig,
  input: HepsijetCreateShipmentInput,
): Promise<{ customerDeliveryNo: string; status?: string }> {
  const token = await hepsijetGetToken(cfg);
  const payload = {
    company: {
      name: cfg.companyName,
      abbreviationCode: cfg.abbreviationCode,
    },
    delivery: {
      customerDeliveryNo: input.customerDeliveryNo,
      customerOrderId: input.customerOrderId,
      deliveryDateOriginal: input.deliveryDate,
      deliveryType: cfg.deliveryType,
      totalParcels: 1,
      desi: Math.max(1, Math.round(input.desi)),
      product: { productCode: cfg.productCode },
      sender: cfg.abbreviationCode,
      currentXDock: { abbreviationCode: cfg.currentXDockCode },
    },
    receiver: {
      companyCustomerId: input.customerDeliveryNo,
      firstName: input.receiver.firstName,
      lastName: input.receiver.lastName,
      phone1: input.receiver.phone.replace(/\D/g, "").slice(-10),
      email: input.receiver.email || undefined,
    },
    senderAddress: nestedAddress(input.senderAddress),
    recipientAddress: nestedAddress(input.recipientAddress),
    deliveryContent: [
      {
        productCode: cfg.productCode,
        description: `Sipariş ${input.customerOrderId}`,
        desi: Math.max(1, Math.round(input.desi)),
      },
    ],
  };

  const res = await fetch(`${baseUrl(cfg.testMode)}/rest/delivery/sendDeliveryOrderEnhanced`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Auth-Token": token,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const json = await parseJson<{ customerDeliveryNo?: string; status?: string }>(res);
  if (!res.ok || json.status !== "OK") {
    throw new Error(json.message || `HepsiJet gönderi oluşturulamadı (HTTP ${res.status})`);
  }
  return {
    customerDeliveryNo: json.data?.customerDeliveryNo || input.customerDeliveryNo,
    status: json.data?.status,
  };
}

export async function hepsijetFetchLabelPdfBase64(
  cfg: HepsijetCarrierConfig,
  barcodes: string[],
): Promise<string | null> {
  const token = await hepsijetGetToken(cfg);
  const res = await fetch(`${baseUrl(cfg.testMode)}/delivery/barcodes-label?format=PDF`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Auth-Token": token,
    },
    body: JSON.stringify({ barcodes }),
    cache: "no-store",
  });
  const json = await parseJson<{ labels?: Array<{ barcode?: string; label?: string }>; label?: string }>(res);
  if (!res.ok || json.status !== "OK") {
    throw new Error(json.message || `HepsiJet etiket alınamadı (HTTP ${res.status})`);
  }
  const label =
    json.data?.label ??
    json.data?.labels?.find((l) => l.barcode === barcodes[0])?.label ??
    json.data?.labels?.[0]?.label;
  return label?.trim() || null;
}

export async function hepsijetTrackShipment(cfg: HepsijetCarrierConfig, barcode: string): Promise<string | null> {
  const token = await hepsijetGetToken(cfg);
  const res = await fetch(`${baseUrl(cfg.testMode)}/rest/delivery/integration/track`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Auth-Token": token,
    },
    body: JSON.stringify({ barcode }),
    cache: "no-store",
  });
  const json = await parseJson<{ deliveryStatus?: string; status?: string }>(res);
  if (!res.ok || json.status !== "OK") return null;
  return json.data?.deliveryStatus ?? json.data?.status ?? null;
}

export async function hepsijetCancelShipment(cfg: HepsijetCarrierConfig, barcode: string): Promise<void> {
  const token = await hepsijetGetToken(cfg);
  const res = await fetch(
    `${baseUrl(cfg.testMode)}/rest/delivery/deleteDeliveryOrder/${encodeURIComponent(barcode)}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "X-Auth-Token": token,
      },
      cache: "no-store",
    },
  );
  const json = await parseJson<unknown>(res);
  if (!res.ok || json.status !== "OK") {
    throw new Error(json.message || `HepsiJet iptal başarısız (HTTP ${res.status})`);
  }
}
