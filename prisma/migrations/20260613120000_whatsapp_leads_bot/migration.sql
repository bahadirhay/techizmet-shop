-- WhatsApp gelen kutusu, bot akışı
CREATE TABLE "shop"."whatsapp_lead" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT NOT NULL,
    "pagePath" TEXT,
    "botPath" TEXT,
    "prefilledText" TEXT,
    "notes" TEXT,
    "contactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop"."whatsapp_bot_node" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "parentId" TEXT,
    "label" TEXT NOT NULL,
    "botReply" TEXT,
    "messageTemplate" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_bot_node_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_lead_ref_key" ON "shop"."whatsapp_lead"("ref");
CREATE INDEX "whatsapp_lead_siteId_status_createdAt_idx" ON "shop"."whatsapp_lead"("siteId", "status", "createdAt");
CREATE INDEX "whatsapp_lead_siteId_createdAt_idx" ON "shop"."whatsapp_lead"("siteId", "createdAt");
CREATE INDEX "whatsapp_bot_node_siteId_parentId_sortOrder_idx" ON "shop"."whatsapp_bot_node"("siteId", "parentId", "sortOrder");

ALTER TABLE "shop"."whatsapp_lead" ADD CONSTRAINT "whatsapp_lead_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."whatsapp_bot_node" ADD CONSTRAINT "whatsapp_bot_node_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
