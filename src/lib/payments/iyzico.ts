import crypto from "node:crypto";
import type { SiteSettings } from "@/lib/site-settings";

export type IyzicoConfig = {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  testMode: boolean;
};

const IYZICO_SANDBOX = "https://sandbox-api.iyzipay.com";
const IYZICO_PRODUCTION = "https://api.iyzipay.com";

export function getIyzicoConfig(settings: SiteSettings): IyzicoConfig | null {
  const p = settings.payment?.iyzico;
  if (!p?.apiKey?.trim() || !p?.secretKey?.trim()) return null;
  const testMode = p.testMode ?? true;
  const baseUrl =
    p.baseUrl?.trim().replace(/\/$/, "") ||
    (testMode ? IYZICO_SANDBOX : IYZICO_PRODUCTION);
  return {
    apiKey: p.apiKey.trim(),
    secretKey: p.secretKey.trim(),
    baseUrl,
    testMode: baseUrl.includes("sandbox"),
  };
}

export function iyzicoConfigStatus(settings: SiteSettings): {
  configured: boolean;
  missing: string[];
  testMode: boolean;
} {
  const p = settings.payment?.iyzico;
  const missing: string[] = [];
  if (!p?.apiKey?.trim()) missing.push("API Key");
  if (!p?.secretKey?.trim()) missing.push("Secret Key");
  const cfg = getIyzicoConfig(settings);
  return { configured: missing.length === 0, missing, testMode: cfg?.testMode ?? true };
}

function iyzicoAuthHeaders(
  cfg: IyzicoConfig,
  path: string,
  body: string,
): Record<string, string> {
  const randomKey = `${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
  const payload = randomKey + path + body;
  const signature = crypto.createHmac("sha256", cfg.secretKey).update(payload).digest("hex");
  const authRaw = `apiKey:${cfg.apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return {
    Authorization: `IYZWSv2 ${Buffer.from(authRaw).toString("base64")}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function iyzicoRequest<T>(
  cfg: IyzicoConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<T & { status?: string; errorMessage?: string; errorCode?: string }> {
  const jsonBody = JSON.stringify(body);
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: "POST",
    headers: iyzicoAuthHeaders(cfg, path, jsonBody),
    body: jsonBody,
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as T & { status?: string; errorMessage?: string; errorCode?: string };
  } catch {
    return { status: "failure", errorMessage: text.slice(0, 200) } as T & {
      status?: string;
      errorMessage?: string;
    };
  }
}

export type IyzicoBasketLine = { id: string; name: string; priceMinor: number };

export type IyzicoCheckoutInitParams = {
  conversationId: string;
  basketId: string;
  priceMinor: number;
  callbackUrl: string;
  buyer: {
    name: string;
    surname: string;
    email: string;
    phone: string;
    city: string;
    address: string;
  };
  /** Satır toplamları (indirim sonrası); kargo ayrı kalem olabilir */
  basketItems: IyzicoBasketLine[];
};

/** iyzico: price = basketItems toplamı (kırılım hatası önlenir) */
export function buildIyzicoBasketFromOrder(order: {
  lines: Array<{ id: string; title: string; lineMinor: number; discountMinor: number }>;
  shippingMinor: number;
  totalMinor: number;
}): IyzicoBasketLine[] {
  const items: IyzicoBasketLine[] = order.lines
    .map((line) => ({
      id: line.id,
      name: line.title,
      priceMinor: Math.max(0, line.lineMinor - line.discountMinor),
    }))
    .filter((line) => line.priceMinor > 0);

  if (order.shippingMinor > 0) {
    items.push({ id: "shipping", name: "Kargo", priceMinor: order.shippingMinor });
  }

  const sumMinor = items.reduce((s, i) => s + i.priceMinor, 0);
  const diff = order.totalMinor - sumMinor;
  if (diff !== 0 && items.length > 0) {
    items[items.length - 1] = {
      ...items[items.length - 1],
      priceMinor: Math.max(0, items[items.length - 1].priceMinor + diff),
    };
  }

  return items;
}

export async function initializeIyzicoCheckout(
  cfg: IyzicoConfig,
  params: IyzicoCheckoutInitParams,
): Promise<
  | { ok: true; token: string; paymentPageUrl: string; checkoutFormContent?: string }
  | { ok: false; error: string }
> {
  const price = (params.priceMinor / 100).toFixed(2);
  const basketItems = params.basketItems.map((item) => ({
    id: item.id.slice(0, 50),
    name: item.name.slice(0, 100),
    category1: item.id === "shipping" ? "Kargo" : "Ürün",
    itemType: "PHYSICAL",
    price: (item.priceMinor / 100).toFixed(2),
  }));

  const body = {
    locale: "tr",
    conversationId: params.conversationId.slice(0, 64),
    price,
    paidPrice: price,
    currency: "TRY",
    basketId: params.basketId.slice(0, 64),
    paymentGroup: "PRODUCT",
    callbackUrl: params.callbackUrl,
    enabledInstallments: [1, 2, 3, 6, 9, 12],
    buyer: {
      id: params.basketId.slice(0, 50),
      name: params.buyer.name.slice(0, 50) || "Müşteri",
      surname: params.buyer.surname.slice(0, 50) || "Müşteri",
      gsmNumber: `+90${params.buyer.phone.replace(/\D/g, "").slice(-10) || "5000000000"}`,
      email: params.buyer.email || "guest@example.com",
      identityNumber: "11111111111",
      registrationAddress: params.buyer.address.slice(0, 200) || "Türkiye",
      ip: "85.34.78.112",
      city: params.buyer.city.slice(0, 50) || "Istanbul",
      country: "Turkey",
    },
    shippingAddress: {
      contactName: `${params.buyer.name} ${params.buyer.surname}`.trim().slice(0, 100),
      city: params.buyer.city.slice(0, 50) || "Istanbul",
      country: "Turkey",
      address: params.buyer.address.slice(0, 200) || "Türkiye",
    },
    billingAddress: {
      contactName: `${params.buyer.name} ${params.buyer.surname}`.trim().slice(0, 100),
      city: params.buyer.city.slice(0, 50) || "Istanbul",
      country: "Turkey",
      address: params.buyer.address.slice(0, 200) || "Türkiye",
    },
    basketItems,
  };

  const path = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
  const res = await iyzicoRequest<{
    token?: string;
    paymentPageUrl?: string;
    checkoutFormContent?: string;
  }>(cfg, path, body);

  if (res.status !== "success" || !res.token) {
    return {
      ok: false,
      error: res.errorMessage ?? res.errorCode ?? "iyzico ödeme formu başlatılamadı",
    };
  }

  return {
    ok: true,
    token: res.token,
    paymentPageUrl: res.paymentPageUrl ?? "",
    checkoutFormContent: res.checkoutFormContent,
  };
}

export async function retrieveIyzicoCheckout(
  cfg: IyzicoConfig,
  token: string,
): Promise<{
  ok: boolean;
  paymentStatus?: string;
  paidPrice?: string;
  conversationId?: string;
  error?: string;
}> {
  const path = "/payment/iyzipos/checkoutform/auth/ecom/detail";
  const res = await iyzicoRequest<{
    paymentStatus?: string;
    paidPrice?: string;
    conversationId?: string;
  }>(cfg, path, { locale: "tr", token });

  if (res.status !== "success") {
    return { ok: false, error: res.errorMessage ?? "iyzico ödeme sonucu alınamadı" };
  }

  return {
    ok: true,
    paymentStatus: res.paymentStatus,
    paidPrice: res.paidPrice,
    conversationId: res.conversationId,
  };
}
