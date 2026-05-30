import { DEFAULT_TR_VAT_RATE, normalizeVatRate } from "@/lib/tr-vat-rates";

export function vatRateFromRequestBody(body: Record<string, unknown>): number {
  return normalizeVatRate(body.vatRate, DEFAULT_TR_VAT_RATE);
}
