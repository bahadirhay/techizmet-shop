/**
 * Eksik mama fonu katkılarını sipariş numarasına göre kaydeder.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const orderNumber = process.argv[2]?.trim();

if (!orderNumber) {
  console.error("Sipariş numarası gerekli.");
  process.exit(1);
}

function parseStreetFoodEnabled(settingsJson: string | null): boolean {
  if (!settingsJson) return false;
  try {
    const s = JSON.parse(settingsJson) as { streetFoodFund?: { enabled?: boolean } };
    return s.streetFoodFund?.enabled === true;
  } catch {
    return false;
  }
}

function defaultTargetGrams(settingsJson: string | null): number {
  if (!settingsJson) return 50_000;
  try {
    const s = JSON.parse(settingsJson) as { streetFoodFund?: { defaultTargetGrams?: number } };
    const t = s.streetFoodFund?.defaultTargetGrams;
    return t && t > 0 ? t : 50_000;
  } catch {
    return 50_000;
  }
}

async function ensureCampaign(siteId: string, settingsJson: string | null) {
  const active = await prisma.streetFoodCampaign.findFirst({
    where: { siteId, status: { in: ["active", "goal_reached"] } },
    orderBy: { createdAt: "desc" },
  });
  if (active) return active;
  return prisma.streetFoodCampaign.create({
    data: {
      siteId,
      status: "active",
      targetGrams: defaultTargetGrams(settingsJson),
      collectedGrams: 0,
      titleTr: "Sokak Dostları Mama Fonu",
      titleEn: "Street Friends Food Fund",
    },
  });
}

async function calculateGrams(orderId: string, siteId: string) {
  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    include: { lines: { include: { product: { select: { weightGrams: true } } } } },
  });
  if (!order) return 0;
  let total = 0;
  for (const line of order.lines) {
    const weight = line.product?.weightGrams ?? 0;
    if (weight > 0) total += line.qty * weight;
  }
  return total;
}

async function record(siteId: string, orderId: string, settingsJson: string | null) {
  if (!parseStreetFoodEnabled(settingsJson)) {
    return { grams: 0, recorded: false, reason: "disabled" };
  }

  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    select: { paymentStatus: true, paymentMethod: true, status: true },
  });
  if (!order || order.status === "cancelled") {
    return { grams: 0, recorded: false, reason: "ineligible" };
  }
  const method = order.paymentMethod ?? "cod";
  const eligible =
    order.paymentStatus === "paid" || method === "cod" || method === "bank_transfer";
  if (!eligible) return { grams: 0, recorded: false, reason: "payment" };

  const existing = await prisma.streetFoodContribution.findUnique({
    where: { orderId },
    select: { grams: true },
  });
  if (existing) return { grams: existing.grams, recorded: false, reason: "exists" };

  const grams = await calculateGrams(orderId, siteId);
  if (grams <= 0) return { grams: 0, recorded: false, reason: "zero_grams" };

  const campaign = await ensureCampaign(siteId, settingsJson);
  if (campaign.status === "closed") return { grams: 0, recorded: false, reason: "closed" };

  await prisma.$transaction(async (tx) => {
    await tx.streetFoodContribution.create({
      data: { siteId, campaignId: campaign.id, orderId, grams, source: "order" },
    });
    const updated = await tx.streetFoodCampaign.update({
      where: { id: campaign.id },
      data: { collectedGrams: { increment: grams } },
    });
    if (updated.collectedGrams >= updated.targetGrams && updated.status === "active") {
      await tx.streetFoodCampaign.update({
        where: { id: campaign.id },
        data: { status: "goal_reached", completedAt: new Date() },
      });
    }
  });

  return { grams, recorded: true };
}

async function main() {
  const order = await prisma.storeOrder.findFirst({
    where: { orderNumber },
    select: {
      id: true,
      siteId: true,
      paymentMethod: true,
      paymentStatus: true,
      status: true,
      lines: { select: { title: true, qty: true, product: { select: { weightGrams: true } } } },
      site: { select: { settingsJson: true } },
    },
  });
  if (!order) {
    console.error("Sipariş bulunamadı:", orderNumber);
    process.exit(1);
  }

  const calculatedGrams = await calculateGrams(order.id, order.siteId);
  const result = await record(order.siteId, order.id, order.site.settingsJson);

  console.log(
    JSON.stringify(
      {
        orderNumber,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        lines: order.lines.map((l) => ({
          title: l.title,
          qty: l.qty,
          weightGrams: l.product?.weightGrams ?? null,
        })),
        calculatedGrams,
        ...result,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
