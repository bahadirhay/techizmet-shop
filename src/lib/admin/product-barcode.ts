import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SiteSettings } from "@/lib/site-settings";

export const DEFAULT_BARCODE_PREFIX = "869";

export type ProductBarcodeSettings = {
  autoGenerate: boolean;
  prefix: string;
};

export function normalizeBarcodePrefix(raw?: string): string {
  const digits = (raw ?? DEFAULT_BARCODE_PREFIX).replace(/\D/g, "");
  const core = (digits || DEFAULT_BARCODE_PREFIX).slice(0, 3);
  return core.padEnd(3, "0");
}

export function ean13CheckDigit(d12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(d12[i] ?? 0);
    sum += i % 2 === 0 ? n : n * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

export function buildEan13(prefix: string, body9: string): string {
  const d12 = `${normalizeBarcodePrefix(prefix)}${body9.padStart(9, "0").slice(-9)}`;
  return d12 + ean13CheckDigit(d12);
}

export function isValidEan13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;
  return barcode[12] === ean13CheckDigit(barcode.slice(0, 12));
}

export function getProductBarcodeSettings(settings: SiteSettings): ProductBarcodeSettings {
  return {
    autoGenerate: settings.store?.autoGenerateBarcode === true,
    prefix: normalizeBarcodePrefix(settings.store?.barcodePrefix),
  };
}

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function barcodeExists(
  db: DbClient,
  siteId: string,
  barcode: string,
  excludeProductId?: string,
): Promise<boolean> {
  const row = await db.storeProduct.findFirst({
    where: {
      siteId,
      barcode,
      ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function generateUniqueProductBarcode(
  db: DbClient,
  siteId: string,
  prefix: string,
  excludeProductId?: string,
): Promise<string> {
  for (let attempt = 0; attempt < 64; attempt++) {
    const rand = String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0");
    const ts = String(Date.now() % 1_000_000_000).padStart(9, "0");
    const seq = String(attempt).padStart(2, "0");
    const body = `${attempt < 32 ? rand : ts}${seq}`.slice(-9);
    const candidate = buildEan13(prefix, body);
    if (!(await barcodeExists(db, siteId, candidate, excludeProductId))) {
      return candidate;
    }
  }
  throw new Error("Benzersiz barkod üretilemedi");
}

export async function resolveProductBarcode(
  db: DbClient,
  siteId: string,
  input: {
    barcode?: string | null;
    autoGenerate?: boolean;
    prefix?: string;
    excludeProductId?: string;
  },
): Promise<string | null> {
  const trimmed = input.barcode?.trim();
  if (trimmed) return trimmed;
  if (!input.autoGenerate) return null;

  return generateUniqueProductBarcode(
    db,
    siteId,
    input.prefix ?? DEFAULT_BARCODE_PREFIX,
    input.excludeProductId,
  );
}
