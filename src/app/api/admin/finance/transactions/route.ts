import { NextResponse } from "next/server";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { tryToMinor } from "@/lib/admin/money";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

  const rows = await prisma.financeTransaction.findMany({
    where: { siteId: auth.siteId, ...(kind ? { kind } : {}) },
    orderBy: { txDate: "desc" },
    take: limit,
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
      order: { select: { orderNumber: true } },
    },
  });

  return NextResponse.json({ transactions: rows });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  await ensureFinanceDefaults(auth.siteId);

  const body = (await req.json()) as {
    kind?: string;
    txDate?: string;
    amount?: string | number;
    description?: string;
    categoryId?: string;
    accountId?: string;
    orderId?: string;
    invoiceDirection?: string;
    invoiceNumber?: string;
    counterpartyName?: string;
    counterpartyTaxId?: string;
    vat?: string | number;
    marketplacePlatform?: string;
    marketplaceRef?: string;
    notes?: string;
    reconciliationStatus?: string;
  };

  const kind = body.kind?.trim();
  const amountMinor = tryToMinor(body.amount);
  if (!kind || amountMinor <= 0) {
    return NextResponse.json({ error: "Tür ve tutar gerekli" }, { status: 400 });
  }

  const txDate = body.txDate ? new Date(body.txDate) : new Date();
  if (Number.isNaN(txDate.getTime())) {
    return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
  }

  const isDeduction = kind === "marketplace_deduction";

  const row = await prisma.financeTransaction.create({
    data: {
      siteId: auth.siteId,
      txDate,
      kind,
      amountMinor,
      categoryId: body.categoryId || null,
      accountId: body.accountId || null,
      orderId: body.orderId || null,
      description: body.description?.trim() || kind,
      invoiceDirection: body.invoiceDirection || null,
      invoiceNumber: body.invoiceNumber?.trim() || null,
      counterpartyName: body.counterpartyName?.trim() || null,
      counterpartyTaxId: body.counterpartyTaxId?.trim() || null,
      vatMinor: tryToMinor(body.vat),
      marketplacePlatform: body.marketplacePlatform || null,
      marketplaceRef: body.marketplaceRef?.trim() || null,
      notes: body.notes?.trim() || null,
      reconciliationStatus: isDeduction
        ? body.orderId
          ? "matched"
          : "unmatched"
        : body.reconciliationStatus || "none",
    },
  });

  return NextResponse.json({ transaction: row });
}
