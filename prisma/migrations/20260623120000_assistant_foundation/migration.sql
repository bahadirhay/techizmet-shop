-- İşletme asistanı: bilgi tabanı + konuşma geçmişi

CREATE TABLE "shop"."assistant_knowledge_entry" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT '*',
    "entryType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "keywords" TEXT,
    "sourceRef" TEXT,
    "imageUrl" TEXT,
    "metadataJson" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_knowledge_entry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop"."assistant_conversation" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'bot',
    "customerId" TEXT,
    "metadataJson" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop"."assistant_message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "layer" TEXT,
    "confidence" DOUBLE PRECISION,
    "metadataJson" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assistant_knowledge_entry_siteId_active_entryType_idx" ON "shop"."assistant_knowledge_entry"("siteId", "active", "entryType");
CREATE INDEX "assistant_knowledge_entry_siteId_channel_idx" ON "shop"."assistant_knowledge_entry"("siteId", "channel");
CREATE INDEX "assistant_knowledge_entry_siteId_sourceRef_idx" ON "shop"."assistant_knowledge_entry"("siteId", "sourceRef");

CREATE UNIQUE INDEX "assistant_conversation_siteId_channel_externalUserId_key" ON "shop"."assistant_conversation"("siteId", "channel", "externalUserId");
CREATE INDEX "assistant_conversation_siteId_status_lastMessageAt_idx" ON "shop"."assistant_conversation"("siteId", "status", "lastMessageAt");

CREATE INDEX "assistant_message_conversationId_createdAt_idx" ON "shop"."assistant_message"("conversationId", "createdAt");

ALTER TABLE "shop"."assistant_knowledge_entry" ADD CONSTRAINT "assistant_knowledge_entry_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."assistant_conversation" ADD CONSTRAINT "assistant_conversation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "shop"."site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop"."assistant_message" ADD CONSTRAINT "assistant_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "shop"."assistant_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
