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

/**
 * Amazon fiyat teklifi attribute'u. purchasable_offer canlı satış fiyatını,
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

/**
 * Var olan Amazon listing'lerinde stok ve fiyatı günceller (Listings Items PATCH).
 * Yalnızca SKU'su olan ürünler işlenir; listing bulunamayan SKU'lar atlanır.
 */
export async function syncAmazonPriceAndInventory(
  creds: AmazonSpApiCredentials,
  accessToken: string,
  marketplaceId: string,
  items: AmazonInventoryItem[],
  config: Record<string, string> = {},
): Promise<{ ok: boolean; sent: number; message: string; errors: string[] }> {
  const valid = items.filter((i) => i.sku.trim());
  if (valid.length === 0) {
    return { ok: false, sent: 0, message: "SKU'su olan ürün yok — Amazon stok/fiyat için SKU zorunlu", errors: [] };
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of valid) {
    const productType = await fetchListingProductType(creds, accessToken, marketplaceId, item.sku);
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
    } else {
      const issueMsg =
        json?.issues?.map((x) => x.message).filter(Boolean).join("; ") ||
        `HTTP ${res.status}: ${res.text.slice(0, 160)}`;
      if (errors.length < 5) errors.push(`${item.sku}: ${issueMsg}`);
    }
  }

  const skipNote = skipped ? ` · ${skipped} SKU listing'de yok` : "";
  const errNote = errors.length ? ` · Hata: ${errors.slice(0, 3).join(" | ")}` : "";
  return {
    ok: sent > 0,
    sent,
    message: `${sent}/${valid.length} ürün stok/fiyat güncellendi${skipNote}${errNote}`,
    errors,
  };
}
