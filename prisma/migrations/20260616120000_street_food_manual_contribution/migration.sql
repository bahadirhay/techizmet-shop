-- Manuel mama fonu katkısı (admin panelinden gr ekleme)
ALTER TABLE "shop"."street_food_contribution" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "shop"."street_food_contribution" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'order';
ALTER TABLE "shop"."street_food_contribution" ADD COLUMN IF NOT EXISTS "manualNote" TEXT;
