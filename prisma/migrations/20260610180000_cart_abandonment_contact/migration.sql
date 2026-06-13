-- Sepet terki: checkout iletişim, aşama, WhatsApp hatırlatma, not
ALTER TABLE "shop"."cart_abandonment" ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'cart';
ALTER TABLE "shop"."cart_abandonment" ADD COLUMN "guestEmail" TEXT;
ALTER TABLE "shop"."cart_abandonment" ADD COLUMN "guestPhone" TEXT;
ALTER TABLE "shop"."cart_abandonment" ADD COLUMN "notes" TEXT;
ALTER TABLE "shop"."cart_abandonment" ADD COLUMN "whatsappRemindedAt" TIMESTAMP(3);
