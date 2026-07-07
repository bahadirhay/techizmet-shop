import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import { trendyolRequest } from "@/lib/marketplace/trendyol/client";

export { TRENDYOL_CARGO_PROVIDERS } from "@/lib/marketplace/trendyol/cargo-providers";

export type TrendyolAddress = {
  id: number;
  addressType: string;
  fullAddress: string;
  isShipment: boolean;
  isReturning: boolean;
  isDefault: boolean;
};

/** Satıcının kayıtlı sevkiyat/iade adreslerini getirir */
export async function fetchTrendyolAddresses(
  creds: TrendyolCredentials,
): Promise<{ ok: boolean; addresses: TrendyolAddress[]; message: string }> {
  const path = `/integration/sellers/${creds.sellerId}/addresses`;
  const res = await trendyolRequest(creds, path);
  if (!res.ok) {
    return { ok: false, addresses: [], message: `HTTP ${res.status}: ${res.text.slice(0, 200)}` };
  }

  const obj = (res.json ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(obj.supplierAddresses)
    ? (obj.supplierAddresses as Record<string, unknown>[])
    : [];
  const addresses: TrendyolAddress[] = raw
    .map((a) => ({
      id: Number(a.id),
      addressType: String(a.addressType ?? ""),
      fullAddress: String(a.fullAddress ?? a.address ?? ""),
      isShipment: a.shipmentAddress === true,
      isReturning: a.returningAddress === true,
      isDefault: a.default === true,
    }))
    .filter((a) => Number.isFinite(a.id));

  return { ok: true, addresses, message: `${addresses.length} adres` };
}

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

export type TrendyolCategoryLeaf = { id: number; name: string; path: string };

/** Kategori ağacını çeker, yaprak (alt kategorisi olmayan) kategorileri arar */
export async function searchTrendyolCategories(
  creds: TrendyolCredentials,
  query: string,
): Promise<{ ok: boolean; categories: TrendyolCategoryLeaf[]; message: string }> {
  const res = await trendyolRequest(creds, "/integration/product/product-categories");
  if (!res.ok) {
    return { ok: false, categories: [], message: `HTTP ${res.status}: ${res.text.slice(0, 200)}` };
  }

  const obj = (res.json ?? {}) as Record<string, unknown>;
  const roots = Array.isArray(obj.categories) ? (obj.categories as Record<string, unknown>[]) : [];
  const leaves: TrendyolCategoryLeaf[] = [];

  const walk = (node: Record<string, unknown>, trail: string[]) => {
    const id = Number(node.id);
    const name = String(node.name ?? "");
    const nextTrail = [...trail, name];
    const subs = Array.isArray(node.subCategories)
      ? (node.subCategories as Record<string, unknown>[])
      : [];
    if (subs.length === 0) {
      if (Number.isFinite(id)) leaves.push({ id, name, path: nextTrail.join(" > ") });
    } else {
      for (const sub of subs) walk(sub, nextTrail);
    }
  };
  for (const root of roots) walk(root, []);

  const q = query.trim().toLocaleLowerCase("tr");
  const matched = q
    ? leaves.filter((c) => c.path.toLocaleLowerCase("tr").includes(q))
    : leaves;

  return {
    ok: true,
    categories: matched.slice(0, 50),
    message: `${matched.length} eşleşme (${leaves.length} yaprak kategori)`,
  };
}

export type TrendyolBrand = { id: number; name: string };

/** Marka adına göre Trendyol marka ID araması */
export async function searchTrendyolBrands(
  creds: TrendyolCredentials,
  name: string,
): Promise<{ ok: boolean; brands: TrendyolBrand[]; message: string }> {
  const path = `/integration/product/brands/by-name?name=${encodeURIComponent(name.trim())}`;
  const res = await trendyolRequest(creds, path);
  if (!res.ok) {
    return { ok: false, brands: [], message: `HTTP ${res.status}: ${res.text.slice(0, 200)}` };
  }

  const data = res.json;
  const rawArr = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown>)?.brands)
      ? ((data as Record<string, unknown>).brands as unknown[])
      : [];
  const brands: TrendyolBrand[] = (rawArr as Record<string, unknown>[])
    .map((b) => ({ id: Number(b.id), name: String(b.name ?? "") }))
    .filter((b) => Number.isFinite(b.id));

  return { ok: true, brands, message: `${brands.length} marka` };
}

