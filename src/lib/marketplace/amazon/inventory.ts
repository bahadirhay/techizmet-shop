import {
  amazonSpApiRequest,
  type AmazonSpApiCredentials,
} from "@/lib/marketplace/amazon/client";

export type AmazonInventoryItem = {
  sku: string;
  quantity: number;
  salePriceMinor: number;
  listPriceMinor: number;
};

/** kuruş → 2 ondalıklı sayı (Amazon fiyat alanları büyük birim ister) */
export function minorToAmazonPrice(minor: number): number {
  return Math.round(minor) / 100;
}

/** Hediye mesajı / hediye paketi — varsayılan Hayır (mağazada yok). */
export function resolveAmazonGiftOptions(config: Record<string, string>): {
  canBeGiftMessaged: boolean;
  isGiftWrapAvailable: boolean;
} {
  const parse = (raw?: string) => {
    const v = raw?.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes" || v === "evet";
  };
  return {
    canBeGiftMessaged: parse(config.amazonGiftMessage ?? config.amazonCanBeGiftMessaged),
    isGiftWrapAvailable: parse(config.amazonGiftWrap ?? config.amazonGiftWrapAvailable),
  };
}

export function buildAmazonGiftAttributes(
  marketplaceId: string,
  config: Record<string, string>,
): Record<string, unknown> {
  const gift = resolveAmazonGiftOptions(config);
  return {
    can_be_gift_messaged: [{ value: gift.canBeGiftMessaged, marketplace_id: marketplaceId }],
    is_gift_wrap_available: [{ value: gift.isGiftWrapAvailable, marketplace_id: marketplaceId }],
  };
}

/** Teklif (fiyat/stok/hediye) attribute gövdesi — LISTING_OFFER_ONLY PUT için. */
export function buildAmazonOfferAttributes(
  marketplaceId: string,
  salePriceMinor: number,
  listPriceMinor: number,
  quantity: number,
  config: Record<string, string> = {},
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {
    condition_type: [{ value: "new_new", marketplace_id: marketplaceId }],
    fulfillment_availability: [
      { fulfillment_channel_code: "DEFAULT", quantity: Math.max(0, Math.round(quantity)) },
    ],
    purchasable_offer: [
      {
        marketplace_id: marketplaceId,
        currency: "TRY",
        our_price: [{ schedule: [{ value_with_tax: minorToAmazonPrice(salePriceMinor) }] }],
      },
    ],
    ...buildAmazonGiftAttributes(marketplaceId, config),
  };

  if (listPriceMinor > salePriceMinor) {
    attrs.list_price = [
      {
        marketplace_id: marketplaceId,
        currency: "TRY",
        value: minorToAmazonPrice(listPriceMinor),
      },
    ];
  }

  return attrs;
}

/**
 * Amazon fiyat teklifi PATCH listesi. purchasable_offer canlı satış fiyatını,
 * list_price ise üstü çizili liste fiyatını taşır.
 */
export function buildAmazonOfferPatches(
  marketplaceId: string,
  salePriceMinor: number,
  listPriceMinor: number,
  quantity: number,
  config: Record<string, string> = {},
): { op: "replace"; path: string; value: unknown }[] {
  const patches: { op: "replace"; path: string; value: unknown }[] = [];

  patches.push({
    op: "replace",
    path: "/attributes/condition_type",
    value: [{ value: "new_new", marketplace_id: marketplaceId }],
  });

  patches.push({
    op: "replace",
    path: "/attributes/fulfillment_availability",
    value: [{ fulfillment_channel_code: "DEFAULT", quantity: Math.max(0, Math.round(quantity)) }],
  });

  const offer: Record<string, unknown> = {
    marketplace_id: marketplaceId,
    currency: "TRY",
    our_price: [{ schedule: [{ value_with_tax: minorToAmazonPrice(salePriceMinor) }] }],
  };
  patches.push({
    op: "replace",
    path: "/attributes/purchasable_offer",
    value: [offer],
  });

  if (listPriceMinor > salePriceMinor) {
    patches.push({
      op: "replace",
      path: "/attributes/list_price",
      value: [
        {
          marketplace_id: marketplaceId,
          currency: "TRY",
          value: minorToAmazonPrice(listPriceMinor),
        },
      ],
    });
  }

  const gift = resolveAmazonGiftOptions(config);
  patches.push({
    op: "replace",
    path: "/attributes/can_be_gift_messaged",
    value: [{ value: gift.canBeGiftMessaged, marketplace_id: marketplaceId }],
  });
  patches.push({
    op: "replace",
    path: "/attributes/is_gift_wrap_available",
    value: [{ value: gift.isGiftWrapAvailable, marketplace_id: marketplaceId }],
  });

  return patches;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveFallbackProductType(config: Record<string, string>): string {
  const raw = config.amazonDefaultProductType?.trim();
  if (!raw || raw.toUpperCase() === "PRODUCT") return "PET_FOOD";
  return raw;
}

/** Listing var mı (404 değilse) — productType gelmese bile teklif gönderilebilir. */
async function amazonListingExists(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  marketplaceId: string,
  sku: string,
): Promise<boolean> {
  const qs = new URLSearchParams({ marketplaceIds: marketplaceId });
  const res = await amazonSpApiRequest(
    creds,
    accessToken,
    `/listings/2021-08-01/items/${encodeURIComponent(creds.sellerId)}/${encodeURIComponent(sku)}?${qs}`,
  );
  return res.ok && res.status !== 404;
}

/** Bir SKU'nun mevcut listing'inden productType'ı okur (PATCH için gerekir). */
async function fetchListingProductType(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  marketplaceId: string,
  sku: string,
): Promise<string | null> {
  const qs = new URLSearchParams({
    marketplaceIds: marketplaceId,
    includedData: "productTypes,summaries",
  });
  const res = await amazonSpApiRequest(
    creds,
    accessToken,
    `/listings/2021-08-01/items/${encodeURIComponent(creds.sellerId)}/${encodeURIComponent(sku)}?${qs}`,
  );
  if (!res.ok) return null;
  const json = res.json as Record<string, unknown> | null;
  const summaries = (json?.summaries as Record<string, unknown>[]) ?? [];
  const fromSummary = summaries[0]?.productType;
  if (fromSummary) return String(fromSummary);
  const productTypes = (json?.productTypes as Record<string, unknown>[]) ?? [];
  const fromPt = productTypes[0]?.productType;
  return fromPt ? String(fromPt) : null;
}

/** Amazon listing işlenirken productType gecikebilir — kısa aralıklarla tekrar dene. */
async function resolveListingProductType(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  marketplaceId: string,
  sku: string,
  config: Record<string, string>,
): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const productType = await fetchListingProductType(creds, accessToken, marketplaceId, sku);
    if (productType) return productType;
    if (await amazonListingExists(creds, accessToken, marketplaceId, sku)) {
      return resolveFallbackProductType(config);
    }
    if (attempt < 2) await sleep(5000);
  }
  return null;
}

async function pushAmazonOfferPut(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  marketplaceId: string,
  sku: string,
  productType: string,
  item: AmazonInventoryItem,
  config: Record<string, string>,
): Promise<{ ok: boolean; issueMsg?: string }> {
  const qs = new URLSearchParams({ marketplaceIds: marketplaceId, issueLocale: "tr_TR" });
  const res = await amazonSpApiRequest(
    creds,
    accessToken,
    `/listings/2021-08-01/items/${encodeURIComponent(creds.sellerId)}/${encodeURIComponent(sku)}?${qs}`,
    {
      method: "PUT",
      body: {
        productType,
        requirements: "LISTING_OFFER_ONLY",
        attributes: buildAmazonOfferAttributes(
          marketplaceId,
          item.salePriceMinor,
          item.listPriceMinor,
          item.quantity,
          config,
        ),
      },
    },
  );

  const json = res.json as { status?: string; issues?: { message?: string }[] } | null;
  if (res.ok && (json?.status === "ACCEPTED" || json?.status === "VALID")) {
    return { ok: true };
  }
  const issueMsg =
    json?.issues?.map((x) => x.message).filter(Boolean).join("; ") ||
    `HTTP ${res.status}: ${res.text.slice(0, 160)}`;
  return { ok: false, issueMsg };
}

/**
 * Var olan Amazon listing'lerinde stok ve fiyatı günceller (Listings Items PATCH).
 * PATCH başarısız olursa LISTING_OFFER_ONLY PUT denenir (katalog eşleşmesi / teklif yok).
 */
export async function syncAmazonPriceAndInventory(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  marketplaceId: string,
  items: AmazonInventoryItem[],
  config: Record<string, string> = {},
): Promise<{ ok: boolean; sent: number; message: string; errors: string[]; successSkus: string[] }> {
  const valid = items.filter((i) => i.sku.trim());
  if (valid.length === 0) {
    return {
      ok: false,
      sent: 0,
      message: "SKU'su olan ürün yok — Amazon stok/fiyat için SKU zorunlu",
      errors: [],
      successSkus: [],
    };
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  const successSkus: string[] = [];

  for (const item of valid) {
    const productType = await resolveListingProductType(
      creds,
      accessToken,
      marketplaceId,
      item.sku,
      config,
    );
    if (!productType) {
      skipped++;
      if (errors.length < 5) errors.push(`${item.sku}: Amazon'da listing bulunamadı (önce ürünü gönderin)`);
      continue;
    }

    const qs = new URLSearchParams({ marketplaceIds: marketplaceId });
    const res = await amazonSpApiRequest(
      creds,
      accessToken,
      `/listings/2021-08-01/items/${encodeURIComponent(creds.sellerId)}/${encodeURIComponent(item.sku)}?${qs}`,
      {
        method: "PATCH",
        body: {
          productType,
          patches: buildAmazonOfferPatches(
            marketplaceId,
            item.salePriceMinor,
            item.listPriceMinor,
            item.quantity,
            config,
          ),
        },
      },
    );

    const json = res.json as { status?: string; issues?: { message?: string }[] } | null;
    if (res.ok && (json?.status === "ACCEPTED" || json?.status === "VALID")) {
      sent++;
      successSkus.push(item.sku);
      continue;
    }

    const patchIssueMsg =
      json?.issues?.map((x) => x.message).filter(Boolean).join("; ") ||
      `HTTP ${res.status}: ${res.text.slice(0, 160)}`;
    const offerPut = await pushAmazonOfferPut(
      creds,
      accessToken,
      marketplaceId,
      item.sku,
      productType,
      item,
      config,
    );
    if (offerPut.ok) {
      sent++;
      successSkus.push(item.sku);
    } else if (errors.length < 5) {
      errors.push(`${item.sku}: ${offerPut.issueMsg ?? patchIssueMsg}`);
    }
  }

  const skipNote = skipped ? ` · ${skipped} SKU listing'de yok` : "";
  const errNote = errors.length ? ` · Hata: ${errors.slice(0, 3).join(" | ")}` : "";
  return {
    ok: sent > 0,
    sent,
    message: `${sent}/${valid.length} ürün stok/fiyat güncellendi${skipNote}${errNote}`,
    errors,
    successSkus,
  };
}

/** Yeni gönderilen ilanlarda Amazon işlemesi gecikebilir — başarısız SKU'ları birkaç kez dener. */
export async function syncAmazonOffersWithRetry(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  marketplaceId: string,
  items: AmazonInventoryItem[],
  config: Record<string, string> = {},
  options?: { rounds?: number; delayMs?: number },
): Promise<{ ok: boolean; sent: number; message: string; errors: string[] }> {
  const rounds = options?.rounds ?? 3;
  const delayMs = options?.delayMs ?? 6000;
  const valid = items.filter((i) => i.sku.trim());
  const sentSkus = new Set<string>();
  const errors: string[] = [];
  let pending = valid;

  for (let round = 0; round < rounds && pending.length > 0; round++) {
    if (round > 0) await sleep(delayMs);
    const result = await syncAmazonPriceAndInventory(
      creds,
      accessToken,
      marketplaceId,
      pending,
      config,
    );
    for (const sku of result.successSkus) sentSkus.add(sku);
    pending = pending.filter((item) => !sentSkus.has(item.sku));
    for (const err of result.errors) {
      if (!errors.includes(err) && errors.length < 8) errors.push(err);
    }
  }

  const errNote = errors.length ? ` · Hata: ${errors.slice(0, 3).join(" | ")}` : "";
  return {
    ok: sentSkus.size > 0,
    sent: sentSkus.size,
    message: `${sentSkus.size}/${valid.length} ürün teklif/stok güncellendi${errNote}`,
    errors,
  };
}
