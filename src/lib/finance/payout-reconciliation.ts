import "server-only";

import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { prisma } from "@/lib/prisma";

export type PayoutBatchRow = {
  id: string;
  paymentOrderId: string | null;
  payoutDate: Date;
  payoutAmountMinor: number;
  expectedNetMinor: number | null;
  orderCount: number;
  varianceMinor: number | null;
  status: "ok" | "variance" | "pending_orders" | "manual";
  platform: string;
  description: string;
};

export type PayoutReconciliationReport = {
  batches: PayoutBatchRow[];
  totals: {
    payoutMinor: number;
    expectedMinor: number | null;
    varianceMinor: number | null;
    unlinkedOrders: number;
  };
};

function parsePayoutNotes(notes: string | null): {
  paymentOrderId?: number | string;
  settlementId?: string;
  financialEventGroupId?: string;
  expectedNetMinor?: number;
  orderIds?: string[];
} | null {
  if (!notes?.trim()) return null;
  try {
    return JSON.parse(notes) as {
      paymentOrderId?: number;
      expectedNetMinor?: number;
      orderIds?: string[];
    };
  } catch {
    return null;
  }
}

export async function loadPayoutReconciliation(
  siteId: string,
  platform?: string,
): Promise<PayoutReconciliationReport> {
  const payouts = await prisma.financeTransaction.findMany({
    where: {
      siteId,
      kind: "marketplace_payout",
      ...(platform ? { marketplacePlatform: platform } : {}),
    },
    orderBy: { txDate: "desc" },
    take: 100,
    select: {
      id: true,
      txDate: true,
      amountMinor: true,
      description: true,
      marketplacePlatform: true,
      marketplaceRef: true,
      notes: true,
      reconciliationStatus: true,
    },
  });

  const batches: PayoutBatchRow[] = payouts.map((p) => {
    const meta = parsePayoutNotes(p.notes);
    const paymentOrderId =
      meta?.paymentOrderId != null
        ? String(meta.paymentOrderId)
        : meta?.settlementId
          ? String(meta.settlementId)
          : meta?.financialEventGroupId
            ? String(meta.financialEventGroupId).slice(0, 16)
            : p.marketplaceRef?.startsWith("paymentOrder:")
              ? p.marketplaceRef.replace("paymentOrder:", "")
              : p.marketplaceRef?.startsWith("settlement:")
                ? p.marketplaceRef.replace("settlement:", "")
                : p.marketplaceRef?.startsWith("eventGroup:")
                  ? p.marketplaceRef.replace("eventGroup:", "").slice(0, 16)
                  : null;

    const expectedNetMinor = meta?.expectedNetMinor ?? null;
    const orderCount = meta?.orderIds?.length ?? 0;
    const varianceMinor =
      expectedNetMinor != null ? p.amountMinor - expectedNetMinor : null;

    let status: PayoutBatchRow["status"] = "manual";
    if (paymentOrderId) {
      if (orderCount === 0) status = "pending_orders";
      else if (varianceMinor != null && Math.abs(varianceMinor) > 100) status = "variance";
      else status = "ok";
    }

    return {
      id: p.id,
      paymentOrderId,
      payoutDate: p.txDate,
      payoutAmountMinor: p.amountMinor,
      expectedNetMinor,
      orderCount,
      varianceMinor,
      status,
      platform: p.marketplacePlatform ?? "—",
      description: p.description,
    };
  });

  const unlinkedOrders = await prisma.financeTransaction.count({
    where: {
      siteId,
      kind: "sale_income",
      marketplacePlatform: platform ? platform : { not: null },
      reconciliationStatus: "open",
    },
  });

  const totalPayout = batches.reduce((s, b) => s + b.payoutAmountMinor, 0);
  const withExpected = batches.filter((b) => b.expectedNetMinor != null);
  const totalExpected =
    withExpected.length > 0
      ? withExpected.reduce((s, b) => s + (b.expectedNetMinor ?? 0), 0)
      : null;
  const totalVariance =
    withExpected.length > 0
      ? withExpected.reduce((s, b) => s + (b.varianceMinor ?? 0), 0)
      : null;

  return {
    batches,
    totals: {
      payoutMinor: totalPayout,
      expectedMinor: totalExpected,
      varianceMinor: totalVariance,
      unlinkedOrders,
    },
  };
}

export type CsvPayoutRow = {
  txDate: Date;
  amountMinor: number;
  platform: string;
  reference: string;
  description: string;
};

export function parsePayoutCsv(text: string): { rows: CsvPayoutRow[]; errors: string[] } {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { rows: [], errors: ["En az başlık + bir veri satırı gerekli"] };
  }

  const delim = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delim).map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)));

  const dateIdx = idx(["tarih", "date", "txdate"]);
  const amountIdx = idx(["tutar", "amount", "miktar"]);
  const platformIdx = idx(["platform", "pazaryeri", "kanal"]);
  const refIdx = idx(["referans", "ref", "reference"]);
  const descIdx = idx(["aciklama", "açıklama", "description", "desc"]);

  if (dateIdx < 0 || amountIdx < 0) {
    return {
      rows: [],
      errors: ["CSV'de tarih ve tutar kolonları zorunlu (tarih, tutar, platform, referans, aciklama)"],
    };
  }

  const rows: CsvPayoutRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map((c) => c.trim());
    const dateRaw = cols[dateIdx] ?? "";
    const amountRaw = (cols[amountIdx] ?? "").replace(/\s/g, "").replace(",", ".");
    const platform = (cols[platformIdx] ?? "trendyol").trim().toLowerCase() || "trendyol";
    const reference = cols[refIdx] ?? "";
    const description = cols[descIdx] ?? `CSV hakediş ${reference || i}`;

    const parts = dateRaw.split(/[./-]/);
    let txDate: Date | null = null;
    if (parts.length === 3) {
      const [a, b, c] = parts.map(Number);
      if (a > 31) txDate = new Date(a, b - 1, c);
      else txDate = new Date(c, b - 1, a);
    }
    if (!txDate || Number.isNaN(txDate.getTime())) {
      errors.push(`Satır ${i + 1}: geçersiz tarih "${dateRaw}"`);
      continue;
    }

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Satır ${i + 1}: geçersiz tutar "${cols[amountIdx]}"`);
      continue;
    }

    rows.push({
      txDate,
      amountMinor: Math.round(amount * 100),
      platform,
      reference: reference.trim(),
      description: description.trim(),
    });
  }

  return { rows, errors };
}

export async function importCsvPayouts(
  siteId: string,
  rows: CsvPayoutRow[],
): Promise<{ created: number; skipped: number; errors: string[] }> {
  await ensureFinanceDefaults(siteId);

  const payoutCategory = await prisma.financeCategory.findFirst({
    where: { siteId, kind: "income", name: "Pazaryeri satış" },
  });
  const bankAccount = await prisma.financeAccount.findFirst({
    where: { siteId, kind: "bank" },
  });

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const ref = row.reference
      ? `csv:${row.platform}:${row.reference}`
      : `csv:${row.platform}:${row.txDate.toISOString().slice(0, 10)}:${row.amountMinor}`;

    const existing = await prisma.financeTransaction.findFirst({
      where: { siteId, kind: "marketplace_payout", marketplaceRef: ref },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const account = await prisma.financeAccount.findFirst({
      where: { siteId, kind: "marketplace_receivable", platform: row.platform },
    });

    await prisma.financeTransaction.create({
      data: {
        siteId,
        txDate: row.txDate,
        kind: "marketplace_payout",
        amountMinor: row.amountMinor,
        categoryId: payoutCategory?.id,
        accountId: bankAccount?.id ?? account?.id,
        description: row.description,
        marketplacePlatform: row.platform,
        marketplaceRef: ref,
        reconciliationStatus: "open",
        notes: JSON.stringify({ source: "csv", reference: row.reference }),
      },
    });
    created += 1;
  }

  return { created, skipped, errors };
}
