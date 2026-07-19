-- Web sitesinde gizle / yalnızca pazaryerinde sat (published açık kalabilir)
ALTER TABLE "shop"."product" ADD COLUMN IF NOT EXISTS "storeVisible" BOOLEAN NOT NULL DEFAULT true;
