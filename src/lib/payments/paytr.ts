import crypto from "node:crypto";
import type { SiteSettings } from "@/lib/site-settings";

export type PaytrConfig = {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  testMode: boolean;
};

export function getPaytrConfig(settings: SiteSettings): PaytrConfig | null {
  const p = settings.payment?.paytr;
  if (!p?.merchantId?.trim() || !p?.merchantKey?.trim() || !p?.merchantSalt?.trim()) return null;
  return {
    merchantId: p.merchantId.trim(),
    merchantKey: p.merchantKey.trim(),
    merchantSalt: p.merchantSalt.trim(),
    testMode: Boolean(p.testMode),
  };
}

export function paytrMerchantOid(orderNumber: string): string {
  return orderNumber.replace(/[^a-zA-Z0-9]/g, "").slice(0, 64) || orderNumber;
}

export function buildPaytrToken(
  cfg: PaytrConfig,
  params: {
    userIp: string;
    merchantOid: string;
    email: string;
    paymentAmountMinor: number;
    userBasketB64: string;
  },
): string {
  const hashStr =
    cfg.merchantId +
    params.userIp +
    params.merchantOid +
    params.email +
    String(params.paymentAmountMinor) +
    params.userBasketB64 +
    "0" + // no_installment
    "0" + // max_installment
    "TL" +
    (cfg.testMode ? "1" : "0");

  return crypto
    .createHmac("sha256", cfg.merchantKey)
    .update(hashStr + cfg.merchantSalt)
    .digest("base64");
}

export function verifyPaytrCallbackHash(
  cfg: PaytrConfig,
  body: { merchant_oid: string; status: string; total_amount: string; hash: string },
): boolean {
  const hashStr = body.merchant_oid + cfg.merchantSalt + body.status + body.total_amount;
  const token = crypto.createHmac("sha256", cfg.merchantKey).update(hashStr).digest("base64");
  return token === body.hash;
}

export function encodePaytrBasket(
  lines: { title: string; unitMinor: number; qty: number }[],
): string {
  const basket = lines.map((l) => [
    l.title.slice(0, 80),
    (l.unitMinor / 100).toFixed(2),
    l.qty,
  ]);
  return Buffer.from(JSON.stringify(basket)).toString("base64");
}

export async function requestPaytrIframeToken(
  cfg: PaytrConfig,
  form: Record<string, string>,
): Promise<{ token: string } | { error: string }> {
  const body = new URLSearchParams(form);
  const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { status?: string; token?: string; reason?: string };
  if (json.status === "success" && json.token) return { token: json.token };
  return { error: json.reason ?? "PayTR token alınamadı" };
}
