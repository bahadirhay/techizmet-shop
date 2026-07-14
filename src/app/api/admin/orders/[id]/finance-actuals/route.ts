import { NextResponse } from "next/server";
import {
  applyOrderFinanceSnapshot,
  parseOrderFinanceActuals,
  type OrderFinanceActuals,
} from "@/lib/finance/order-economics";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

const MANUAL_DEDUCTION_NOTE = "manual-actual";

/** Kuruş cinsine normalize et: geçerli sayı → yuvarla, null/geçersiz → undefined (dokunma), açık null → temizle. */
function readMinor(raw: unknown): number | null | undefined {
  if (raw === null) return null;
  if (raw === undefined) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as {
    shippingCostMinor?: number | null;
    marketplaceDeductionMinor?: number | null;
  };

  const order = await prisma.storeOrder.findFirst({
    where: { id, siteId: auth.siteId },
    select: {
      id: true,
      orderNumber: true,
      marketplacePlatform: true,
      financeActualsJson: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  const isMarketplace = Boolean(order.marketplacePlatform);
  const current = parseOrderFinanceActuals(order.financeActualsJson) ?? {};
  const next: OrderFinanceActuals = { ...current };

  const shipping = readMinor(body.shippingCostMinor);
  if (shipping === null) delete next.shippingCostMinor;
  else if (shipping !== undefined) next.shippingCostMinor = shipping;

  const deduction = readMinor(body.marketplaceDeductionMinor);
  if (deduction === null) delete next.marketplaceDeductionMinor;
  else if (deduction !== undefined) next.marketplaceDeductionMinor = deduction;

  next.updatedAt = new Date().toISOString();

  await prisma.storeOrder.update({
    where: { id: order.id },
    data: { financeActualsJson: JSON.stringify(next) },
  });

  // Pazaryeri gerçek kesintisi: onaylı marketplace_deduction olarak yaz (raporlar tahmini yerine onu kullanır).
  if (isMarketplace && body.marketplaceDeductionMinor !== undefined) {
    await ensureFinanceDefaults(auth.siteId);
    // Bu siparişin tüm tahmini kesintilerini ve önceki elle girilen gerçek kesintiyi sil.
    await prisma.financeTransaction.deleteMany({
      where: {
        siteId: auth.siteId,
        orderId: order.id,
        kind: "marketplace_deduction",
        OR: [{ reconciliationStatus: "estimated" }, { notes: MANUAL_DEDUCTION_NOTE }],
      },
    });

    if (deduction !== null && deduction !== undefined && deduction > 0) {
      const income = await prisma.financeTransaction.findFirst({
        where: { siteId: auth.siteId, orderId: order.id, kind: "sale_income" },
        select: { id: true },
      });
      const expenseCat = await prisma.financeCategory.findFirst({
        where: {
          siteId: auth.siteId,
          kind: "expense",
          name: "Pazaryeri komisyon / indirim faturası",
        },
        select: { id: true },
      });
      await prisma.financeTransaction.create({
        data: {
          siteId: auth.siteId,
          txDate: new Date(),
          kind: "marketplace_deduction",
          amountMinor: deduction,
          categoryId: expenseCat?.id,
          orderId: order.id,
          linkedTxId: income?.id ?? null,
          description: `Gerçek pazaryeri kesintisi — ${order.orderNumber} (${order.marketplacePlatform})`,
          marketplacePlatform: order.marketplacePlatform,
          reconciliationStatus: "matched",
          notes: MANUAL_DEDUCTION_NOTE,
        },
      });
    }
  }

  // Snapshot'ı yeniden hesapla (web gerçek kargo ez; kesinti temizlendiyse tahmini yeniden üret).
  await applyOrderFinanceSnapshot(auth.siteId, order.id);

  return NextResponse.json({ ok: true, actuals: next });
}
