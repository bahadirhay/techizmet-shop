import { tryToMinor } from "@/lib/admin/money";
import { serializeCampaignScope, type CampaignScope } from "@/lib/campaign-engine";
import type { Prisma } from "@prisma/client";

export function parseScopeFromBody(body: Record<string, unknown>): CampaignScope | null {
  const scope: CampaignScope = {};
  if (Array.isArray(body.categoryIds)) {
    scope.categoryIds = body.categoryIds.filter((x) => typeof x === "string");
  }
  if (Array.isArray(body.collectionIds)) {
    scope.collectionIds = body.collectionIds.filter((x) => typeof x === "string");
  }
  if (Array.isArray(body.productIds)) {
    scope.productIds = body.productIds.filter((x) => typeof x === "string");
  }
  if (Array.isArray(body.brandIds)) {
    scope.brandIds = body.brandIds.filter((x) => typeof x === "string");
  }
  return serializeCampaignScope(scope) ? scope : null;
}

export function parseCampaignBody(body: Record<string, unknown>, partial = false) {
  const type = body.type != null ? String(body.type) : partial ? undefined : "percent_off";
  const scope = body.scope !== undefined || !partial ? parseScopeFromBody(body) : undefined;

  const buyQty =
    body.buyQuantity != null && body.buyQuantity !== ""
      ? parseInt(String(body.buyQuantity), 10) || null
      : type === "buy_x_pay_y"
        ? null
        : partial
          ? undefined
          : null;

  const payQty =
    body.payQuantity != null && body.payQuantity !== ""
      ? parseInt(String(body.payQuantity), 10) || null
      : type === "buy_x_pay_y"
        ? null
        : partial
          ? undefined
          : null;

  return {
    name: body.name != null ? String(body.name).trim() : undefined,
    code: body.code !== undefined ? String(body.code ?? "").trim().toUpperCase() || null : undefined,
    type,
    percentOff:
      type === "percent_off" && body.percentOff != null
        ? parseInt(String(body.percentOff), 10) || null
        : type !== undefined && type !== "percent_off"
          ? null
          : undefined,
    amountOffMinor:
      body.amountOff !== undefined
        ? body.amountOff
          ? tryToMinor(body.amountOff as string)
          : null
        : undefined,
    buyQuantity: buyQty,
    payQuantity: payQty,
    scopeJson:
      scope !== undefined ? serializeCampaignScope(scope) : body.scopeJson !== undefined ? null : undefined,
    autoApply: body.autoApply !== undefined ? Boolean(body.autoApply) : undefined,
    minCartMinor:
      body.minCart !== undefined ? (body.minCart ? tryToMinor(body.minCart as string) : null) : undefined,
    freeShipping:
      type === "free_shipping"
        ? true
        : body.freeShipping !== undefined
          ? Boolean(body.freeShipping)
          : undefined,
    maxUses:
      body.maxUses !== undefined ? (body.maxUses ? parseInt(String(body.maxUses), 10) : null) : undefined,
    active: body.active !== undefined ? Boolean(body.active) : undefined,
    startsAt:
      body.startsAt !== undefined ? (body.startsAt ? new Date(String(body.startsAt)) : null) : undefined,
    endsAt: body.endsAt !== undefined ? (body.endsAt ? new Date(String(body.endsAt)) : null) : undefined,
    description:
      body.description !== undefined ? String(body.description ?? "").trim() || null : undefined,
  };
}

export function validateCampaignData(
  data: {
    type?: string | null;
    buyQuantity?: number | null;
    payQuantity?: number | null;
    autoApply?: boolean;
    code?: string | null;
  },
): string | null {
  if (data.type === "buy_x_pay_y") {
    if (!data.buyQuantity || !data.payQuantity) return "X al Y öde için adetler gerekli";
    if (data.buyQuantity < 2 || data.payQuantity < 1 || data.payQuantity >= data.buyQuantity) {
      return "Geçersiz X/Y değerleri (örn. 3 al 2 öde)";
    }
  }
  if (data.autoApply && data.code) {
    return "Otomatik kampanyada kupon kodu boş olmalı";
  }
  return null;
}

export function toCampaignCreateInput(
  siteId: string,
  data: ReturnType<typeof parseCampaignBody> & { name: string },
): Prisma.StoreCampaignUncheckedCreateInput {
  return {
    siteId,
    name: data.name,
    code: data.code ?? null,
    type: data.type ?? "percent_off",
    percentOff: data.percentOff ?? null,
    amountOffMinor: data.amountOffMinor ?? null,
    buyQuantity: data.buyQuantity ?? null,
    payQuantity: data.payQuantity ?? null,
    scopeJson: data.scopeJson ?? null,
    autoApply: data.autoApply ?? false,
    minCartMinor: data.minCartMinor ?? null,
    freeShipping: data.freeShipping ?? false,
    maxUses: data.maxUses ?? null,
    active: data.active ?? true,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null,
    description: data.description ?? null,
  };
}
