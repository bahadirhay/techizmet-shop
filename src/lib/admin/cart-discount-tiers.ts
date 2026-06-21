import { prisma } from "@/lib/prisma";

export type CartDiscountTierKey = "tier1" | "tier2" | "second_item" | "first_order";

export type CartDiscountTierRow = {
  key: CartDiscountTierKey;
  minTry: number | null;
  percent: number;
  active: boolean;
  campaignId: string | null;
};

export type CartDiscountTiersState = {
  tier1: CartDiscountTierRow;
  tier2: CartDiscountTierRow;
  secondItem: CartDiscountTierRow;
  firstOrder: CartDiscountTierRow;
};

export type CartDiscountTiersSaveInput = {
  tier1MinTry: number;
  tier1Percent: number;
  tier1Active: boolean;
  tier2MinTry: number;
  tier2Percent: number;
  tier2Active: boolean;
  secondItemPercent: number;
  secondItemActive: boolean;
  firstOrderPercent: number;
  firstOrderActive: boolean;
};

const PRESET_PREFIX = "preset:";

const PRESET_META: Record<
  CartDiscountTierKey,
  {
    legacyNames: string[];
    type: string;
    autoApply: boolean;
    firstOrderOnly: boolean;
    defaultPercent: number;
    defaultMinTry: number | null;
    defaultActive: boolean;
    tierName?: (minTry: number, percent: number) => string;
    description: string;
  }
> = {
  tier1: {
    legacyNames: ["999 TL Üzeri %15 İndirim"],
    type: "percent_off",
    autoApply: true,
    firstOrderOnly: false,
    defaultPercent: 15,
    defaultMinTry: 999,
    defaultActive: true,
    tierName: formatTierCampaignName,
    description: "Sepet tutarı eşiği — 1. kademe",
  },
  tier2: {
    legacyNames: ["1.499 TL Üzeri %20 İndirim"],
    type: "percent_off",
    autoApply: true,
    firstOrderOnly: false,
    defaultPercent: 20,
    defaultMinTry: 1499,
    defaultActive: true,
    tierName: formatTierCampaignName,
    description: "Sepet tutarı eşiği — 2. kademe",
  },
  second_item: {
    legacyNames: ["2. Ürüne %50 İndirim"],
    type: "second_item_percent_off",
    autoApply: true,
    firstOrderOnly: false,
    defaultPercent: 50,
    defaultMinTry: null,
    defaultActive: true,
    tierName: (_, percent) => `2. Ürüne %${percent} İndirim`,
    description: "Sepette 2+ üründe en ucuz birimde indirim",
  },
  first_order: {
    legacyNames: ["İlk Alışveriş %10"],
    type: "percent_off",
    autoApply: true,
    firstOrderOnly: true,
    defaultPercent: 10,
    defaultMinTry: null,
    defaultActive: true,
    tierName: (_, percent) => `İlk Alışveriş %${percent}`,
    description: "Yalnızca ilk sipariş",
  },
};

function presetDescription(key: CartDiscountTierKey): string {
  return `${PRESET_PREFIX}${key}`;
}

export function formatTierCampaignName(minTry: number, percent: number): string {
  const formatted = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(minTry);
  return `${formatted} TL Üzeri %${percent} İndirim`;
}

async function findPresetCampaign(siteId: string, key: CartDiscountTierKey) {
  const meta = PRESET_META[key];
  return prisma.storeCampaign.findFirst({
    where: {
      siteId,
      OR: [{ description: presetDescription(key) }, ...meta.legacyNames.map((name) => ({ name }))],
    },
  });
}

function rowFromCampaign(
  key: CartDiscountTierKey,
  campaign: { id: string; minCartMinor: number | null; percentOff: number | null; active: boolean } | null,
): CartDiscountTierRow {
  const meta = PRESET_META[key];
  return {
    key,
    minTry: campaign?.minCartMinor != null ? campaign.minCartMinor / 100 : meta.defaultMinTry,
    percent: campaign?.percentOff ?? meta.defaultPercent,
    active: campaign?.active ?? meta.defaultActive,
    campaignId: campaign?.id ?? null,
  };
}

export async function loadCartDiscountTiers(siteId: string): Promise<CartDiscountTiersState> {
  const [tier1, tier2, secondItem, firstOrder] = await Promise.all([
    findPresetCampaign(siteId, "tier1"),
    findPresetCampaign(siteId, "tier2"),
    findPresetCampaign(siteId, "second_item"),
    findPresetCampaign(siteId, "first_order"),
  ]);

  return {
    tier1: rowFromCampaign("tier1", tier1),
    tier2: rowFromCampaign("tier2", tier2),
    secondItem: rowFromCampaign("second_item", secondItem),
    firstOrder: rowFromCampaign("first_order", firstOrder),
  };
}

function clampPercent(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, Math.round(v)));
}

function clampMinTry(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.round(v * 100) / 100;
}

async function upsertPresetCampaign(
  siteId: string,
  key: CartDiscountTierKey,
  input: { minTry: number | null; percent: number; active: boolean },
) {
  const meta = PRESET_META[key];
  const percent = clampPercent(input.percent);
  const minTry = input.minTry != null ? clampMinTry(input.minTry) : null;
  const name =
    meta.tierName?.(minTry ?? 0, percent) ??
    `${percent}% indirim`;

  const data = {
    siteId,
    name,
    code: null as string | null,
    type: meta.type,
    percentOff: percent,
    amountOffMinor: null as number | null,
    buyQuantity: null as number | null,
    payQuantity: null as number | null,
    scopeJson: null as string | null,
    autoApply: meta.autoApply,
    firstOrderOnly: meta.firstOrderOnly,
    minCartMinor: minTry != null && minTry > 0 ? Math.round(minTry * 100) : null,
    freeShipping: false,
    active: input.active,
    description: presetDescription(key),
  };

  const existing = await findPresetCampaign(siteId, key);
  if (existing) {
    return prisma.storeCampaign.update({ where: { id: existing.id }, data });
  }
  return prisma.storeCampaign.create({ data });
}

export async function saveCartDiscountTiers(siteId: string, input: CartDiscountTiersSaveInput) {
  const tier1Min = clampMinTry(input.tier1MinTry);
  const tier2Min = clampMinTry(input.tier2MinTry);
  if (tier1Min <= 0 || tier2Min <= 0) {
    throw new Error("Sepet eşikleri 0 TL'den büyük olmalıdır");
  }
  if (tier2Min <= tier1Min) {
    throw new Error("2. kademe eşiği, 1. kademeden yüksek olmalıdır");
  }

  await Promise.all([
    upsertPresetCampaign(siteId, "tier1", {
      minTry: tier1Min,
      percent: input.tier1Percent,
      active: input.tier1Active,
    }),
    upsertPresetCampaign(siteId, "tier2", {
      minTry: tier2Min,
      percent: input.tier2Percent,
      active: input.tier2Active,
    }),
    upsertPresetCampaign(siteId, "second_item", {
      minTry: null,
      percent: input.secondItemPercent,
      active: input.secondItemActive,
    }),
    upsertPresetCampaign(siteId, "first_order", {
      minTry: null,
      percent: input.firstOrderPercent,
      active: input.firstOrderActive,
    }),
  ]);

  return loadCartDiscountTiers(siteId);
}

export function parseCartDiscountTiersBody(body: Record<string, unknown>): CartDiscountTiersSaveInput | null {
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };
  const bool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1";

  const tier1MinTry = num(body.tier1MinTry);
  const tier2MinTry = num(body.tier2MinTry);
  const tier1Percent = num(body.tier1Percent);
  const tier2Percent = num(body.tier2Percent);
  const secondItemPercent = num(body.secondItemPercent);
  const firstOrderPercent = num(body.firstOrderPercent);

  if (
    [tier1MinTry, tier2MinTry, tier1Percent, tier2Percent, secondItemPercent, firstOrderPercent].some(
      (n) => !Number.isFinite(n),
    )
  ) {
    return null;
  }

  return {
    tier1MinTry,
    tier1Percent,
    tier1Active: bool(body.tier1Active),
    tier2MinTry,
    tier2Percent,
    tier2Active: bool(body.tier2Active),
    secondItemPercent,
    secondItemActive: bool(body.secondItemActive),
    firstOrderPercent,
    firstOrderActive: bool(body.firstOrderActive),
  };
}
