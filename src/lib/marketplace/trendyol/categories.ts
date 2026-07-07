import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import { trendyolRequest } from "@/lib/marketplace/trendyol/client";

export type TrendyolAttributeValue = { id: number; name: string };

export type TrendyolCategoryAttribute = {
  attributeId: number;
  attributeName: string;
  required: boolean;
  allowCustom: boolean;
  varianter: boolean;
  values: TrendyolAttributeValue[];
};

/** Trendyol kategori zorunlu/opsiyonel özelliklerini getirir */
export async function fetchTrendyolCategoryAttributes(
  creds: TrendyolCredentials,
  categoryId: number,
): Promise<{ ok: boolean; attributes: TrendyolCategoryAttribute[]; message: string }> {
  const path = `/integration/product/product-categories/${categoryId}/attributes`;
  const res = await trendyolRequest(creds, path);
  if (!res.ok) {
    return { ok: false, attributes: [], message: `HTTP ${res.status}: ${res.text.slice(0, 200)}` };
  }

  const obj = (res.json ?? {}) as Record<string, unknown>;
  const rawList = Array.isArray(obj.categoryAttributes) ? obj.categoryAttributes : [];
  const attributes: TrendyolCategoryAttribute[] = [];

  for (const raw of rawList as Record<string, unknown>[]) {
    const attr = (raw.attribute ?? {}) as Record<string, unknown>;
    const attributeId = Number(attr.id);
    if (!Number.isFinite(attributeId)) continue;
    const values = Array.isArray(raw.attributeValues)
      ? (raw.attributeValues as Record<string, unknown>[])
          .map((v) => ({ id: Number(v.id), name: String(v.name ?? "") }))
          .filter((v) => Number.isFinite(v.id))
      : [];
    attributes.push({
      attributeId,
      attributeName: String(attr.name ?? `#${attributeId}`),
      required: raw.required === true,
      allowCustom: raw.allowCustom === true,
      varianter: raw.varianter === true,
      values,
    });
  }

  return { ok: true, attributes, message: `${attributes.length} özellik` };
}

export type TrendyolBatchItemResult = {
  barcode: string;
  status: "SUCCESS" | "FAILED" | "PROCESSING" | string;
  failureReasons: string[];
};

export type TrendyolBatchResult = {
  ok: boolean;
  status: string;
  items: TrendyolBatchItemResult[];
  message: string;
};

/** Ürün gönderim batch'inin sonucunu sorgular (kabul/red) */
export async function checkTrendyolBatchRequest(
  creds: TrendyolCredentials,
  batchRequestId: string,
): Promise<TrendyolBatchResult> {
  const path = `/integration/product/sellers/${creds.sellerId}/products/batch-requests/${batchRequestId}`;
  const res = await trendyolRequest(creds, path);
  if (!res.ok) {
    return { ok: false, status: "unknown", items: [], message: `HTTP ${res.status}` };
  }

  const obj = (res.json ?? {}) as Record<string, unknown>;
  const status = String(obj.status ?? "PROCESSING");
  const rawItems = Array.isArray(obj.items) ? (obj.items as Record<string, unknown>[]) : [];
  const items: TrendyolBatchItemResult[] = rawItems.map((it) => {
    const reqItem = (it.requestItem ?? {}) as Record<string, unknown>;
    const reasons = Array.isArray(it.failureReasons)
      ? (it.failureReasons as unknown[]).map((r) =>
          typeof r === "string" ? r : String((r as Record<string, unknown>)?.message ?? r),
        )
      : [];
    return {
      barcode: String(reqItem.barcode ?? ""),
      status: String(it.status ?? "PROCESSING"),
      failureReasons: reasons,
    };
  });

  return { ok: true, status, items, message: `${status}: ${items.length} kalem` };
}
