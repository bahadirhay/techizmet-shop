/**
 * Eksik mama fonu katkılarını sipariş numarasına göre kaydeder.
 * Kullanım: node scripts/backfill-street-food-order.mjs AP-20260616-YD2W7I
 */
import { PrismaClient } from "@prisma/client";

const orderNumber = process.argv[2]?.trim();
if (!orderNumber) {
  console.error("Sipariş numarası gerekli.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.storeOrder.findFirst({
    where: { orderNumber },
    select: { id: true, siteId: true, paymentMethod: true, paymentStatus: true, status: true },
  });
  if (!order) {
    console.error("Sipariş bulunamadı:", orderNumber);
    process.exit(1);
  }

  const { recordStreetFoodContributionOnPayment, calculateOrderContributionGrams } = await import(
    "../src/lib/street-food-fund/contribution.ts"
  );

  const grams = await calculateOrderContributionGrams(order.id, order.siteId);
  const result = await recordStreetFoodContributionOnPayment(order.siteId, order.id);

  console.log(
    JSON.stringify(
      {
        orderNumber,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        calculatedGrams: grams,
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
