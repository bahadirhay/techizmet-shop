import { prisma } from "@/lib/prisma";

/** Prisma client bazen db:push sonrası yenilenmeden eski kalır (dev sunucu kilidi). */
type CategoryMappingRow = {
  id: string;
  siteId: string;
  platform: string;
  categoryId: string | null;
  platformCategoryId: string;
  platformBrandId: string | null;
  category?: { id: string; title: string } | null;
};

type CategoryMappingDb = {
  findFirst: (args: unknown) => Promise<CategoryMappingRow | null>;
  findMany: (args: unknown) => Promise<CategoryMappingRow[]>;
  upsert: (args: unknown) => Promise<CategoryMappingRow>;
  update: (args: unknown) => Promise<CategoryMappingRow>;
  create: (args: unknown) => Promise<CategoryMappingRow>;
};

type ProductListingDb = {
  upsert: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
};

type CategoryAttributeRow = {
  id: string;
  siteId: string;
  platform: string;
  categoryId: string | null;
  attributeId: number;
  attributeName: string;
  attributeValueId: number | null;
  attributeValueName: string | null;
  customValue: string | null;
  required: boolean;
};

type CategoryAttributeDb = {
  findMany: (args: unknown) => Promise<CategoryAttributeRow[]>;
  upsert: (args: unknown) => Promise<CategoryAttributeRow>;
  deleteMany: (args: unknown) => Promise<{ count: number }>;
};

type CommissionRuleRow = {
  id: string;
  siteId: string;
  platform: string;
  categoryId: string | null;
  commissionPercent: number;
  extraCommissionPercent: number;
  shippingModel: string;
  shippingFeeMinor: number;
  notes: string | null;
  category?: { title: string } | null;
};

type CommissionRuleDb = {
  findFirst: (args: unknown) => Promise<CommissionRuleRow | null>;
  findMany: (args: unknown) => Promise<CommissionRuleRow[]>;
  create: (args: unknown) => Promise<CommissionRuleRow>;
  update: (args: unknown) => Promise<CommissionRuleRow>;
  delete: (args: unknown) => Promise<CommissionRuleRow>;
};

function readDelegate(key: string): unknown {
  return (prisma as unknown as Record<string, unknown>)[key];
}

export function marketplaceCategoryMappingDb(): CategoryMappingDb | null {
  const d = readDelegate("marketplaceCategoryMapping") as CategoryMappingDb | undefined;
  if (!d || typeof d.findMany !== "function") return null;
  return d;
}

export function marketplaceProductListingDb(): ProductListingDb | null {
  const d = readDelegate("marketplaceProductListing") as ProductListingDb | undefined;
  if (!d || typeof d.upsert !== "function") return null;
  return d;
}

export function marketplaceCategoryAttributeDb(): CategoryAttributeDb | null {
  const d = readDelegate("marketplaceCategoryAttribute") as CategoryAttributeDb | undefined;
  if (!d || typeof d.findMany !== "function") return null;
  return d;
}

export function marketplaceCommissionRuleDb(): CommissionRuleDb | null {
  const d = readDelegate("marketplaceCommissionRule") as CommissionRuleDb | undefined;
  if (!d || typeof d.findMany !== "function") return null;
  return d;
}

export const MARKETPLACE_PRISMA_STALE_MSG =
  "Pazaryeri tabloları için Prisma client güncel değil. Dev sunucuyu durdurup `npx prisma generate` çalıştırın, sonra yeniden başlatın.";
