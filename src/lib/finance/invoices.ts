import type { Prisma } from "@prisma/client";
import { tryToMinor } from "@/lib/admin/money";

export type DraftInvoiceLineInput = {
  description: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
  unit?: string;
};

export type NormalizedInvoiceLine = {
  description: string;
  qty: number;
  unitPriceMinor: number;
  lineSubtotalMinor: number;
  vatRate: number;
  vatMinor: number;
  totalMinor: number;
  unit?: string;
};

export function normalizeInvoiceLines(lines: DraftInvoiceLineInput[]): {
  lines: NormalizedInvoiceLine[];
  subtotalMinor: number;
  vatMinor: number;
  totalMinor: number;
} {
  const normalized = lines
    .map((l) => ({
      description: String(l.description ?? "").trim(),
      qty: Number(l.qty ?? 0),
      unitPriceMinor: tryToMinor(l.unitPrice),
      vatRate: Math.max(0, Number(l.vatRate ?? 0)),
      unit: l.unit?.trim() || undefined,
    }))
    .filter((l) => l.description && l.qty > 0 && l.unitPriceMinor > 0)
    .map((l) => {
      const lineSubtotalMinor = Math.round(l.qty * l.unitPriceMinor);
      const vatMinor = Math.round((lineSubtotalMinor * l.vatRate) / 100);
      return {
        ...l,
        lineSubtotalMinor,
        vatMinor,
        totalMinor: lineSubtotalMinor + vatMinor,
      };
    });

  const subtotalMinor = normalized.reduce((sum, l) => sum + l.lineSubtotalMinor, 0);
  const vatMinor = normalized.reduce((sum, l) => sum + l.vatMinor, 0);
  const totalMinor = subtotalMinor + vatMinor;
  return { lines: normalized, subtotalMinor, vatMinor, totalMinor };
}

export function invoiceLinesToJson(lines: NormalizedInvoiceLine[]): string {
  return JSON.stringify(lines);
}

export function parseInvoiceLinesJson(raw: string | null | undefined): NormalizedInvoiceLine[] {
  if (!raw?.trim()) return [];
  try {
    const arr = JSON.parse(raw) as unknown[];
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is NormalizedInvoiceLine => {
      if (!x || typeof x !== "object") return false;
      const r = x as Record<string, unknown>;
      return (
        typeof r.description === "string" &&
        typeof r.qty === "number" &&
        typeof r.unitPriceMinor === "number"
      );
    });
  } catch {
    return [];
  }
}

export function financeKindFromDirection(direction: string): "other_income" | "expense" {
  return direction === "outgoing" ? "other_income" : "expense";
}

export function invoiceRequiresPosting(status: string): boolean {
  return status === "approved" || status === "pending_approval";
}

export type FinanceInvoiceWithPostingDeps = Prisma.FinanceInvoiceGetPayload<{
  include: { customer: true; counterparty: true };
}>;
