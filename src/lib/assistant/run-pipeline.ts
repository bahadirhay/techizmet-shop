import "server-only";

import { prisma } from "@/lib/prisma";
import { generateAssistantAiReply } from "@/lib/assistant/ai-reply";
import {
  formatKnowledgeReply,
  searchAssistantKnowledge,
} from "@/lib/assistant/knowledge-search";
import {
  getAssistantConfig,
  isAssistantChannelEnabled,
  type ResolvedAssistantConfig,
} from "@/lib/assistant/settings";
import type {
  AssistantChannel,
  AssistantPipelineResult,
  PipelineTraceStep,
} from "@/lib/assistant/types";
import { getSiteSettings } from "@/lib/site-settings";

export type RunAssistantPipelineInput = {
  siteId: string;
  channel: AssistantChannel;
  externalUserId: string;
  message: string;
  /** Test modunda konuşma kaydı opsiyonel */
  persist?: boolean;
};

function normalizeText(s: string): string {
  return s.trim();
}

function wantsHandoff(message: string, config: ResolvedAssistantConfig): boolean {
  const lower = message.toLocaleLowerCase("tr");
  return config.handoffKeywords.some((kw) => lower.includes(kw));
}

const HANDOFF_REPLY =
  "Sizi canlı destek ekibimize aktarıyorum. Kısa süre içinde bir temsilcimiz size dönüş yapacaktır.";

const DISABLED_REPLY =
  "Asistan şu an kapalı. Lütfen daha sonra tekrar deneyin veya canlı destek ile iletişime geçin.";

async function getOrCreateConversation(
  siteId: string,
  channel: AssistantChannel,
  externalUserId: string,
) {
  return prisma.assistantConversation.upsert({
    where: {
      siteId_channel_externalUserId: { siteId, channel, externalUserId },
    },
    create: { siteId, channel, externalUserId, status: "bot" },
    update: { lastMessageAt: new Date() },
  });
}

async function loadRecentMessages(conversationId: string) {
  return prisma.assistantMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { role: true, body: true },
  });
}

async function countRecentLowConfidence(conversationId: string, limit: number): Promise<number> {
  const rows = await prisma.assistantMessage.findMany({
    where: { conversationId, role: "assistant" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { confidence: true, layer: true },
  });
  return rows.filter((r) => (r.confidence ?? 1) < 0.35 || r.layer === "handoff").length;
}

export async function runAssistantPipeline(
  input: RunAssistantPipelineInput,
): Promise<AssistantPipelineResult> {
  const trace: PipelineTraceStep[] = [];
  const message = normalizeText(input.message);
  const persist = input.persist !== false;

  const site = await prisma.storeSite.findUnique({
    where: { id: input.siteId },
    select: { name: true },
  });
  const settings = await getSiteSettings(input.siteId);
  const config = getAssistantConfig(settings, site?.name);

  trace.push({ step: "config", detail: `enabled=${config.enabled}, channel=${input.channel}` });

  if (!isAssistantChannelEnabled(config, input.channel)) {
    return {
      reply: DISABLED_REPLY,
      layer: "disabled",
      confidence: 1,
      handoff: false,
      conversationId: "",
      trace,
      sources: [],
    };
  }

  const conversation = persist
    ? await getOrCreateConversation(input.siteId, input.channel, input.externalUserId)
    : null;

  if (persist && conversation) {
    await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        body: message,
        layer: "rule",
      },
    });
  }

  if (conversation?.status === "handoff") {
    trace.push({ step: "handoff_active" });
    const result: AssistantPipelineResult = {
      reply: HANDOFF_REPLY,
      layer: "handoff",
      confidence: 1,
      handoff: true,
      conversationId: conversation.id,
      trace,
      sources: [],
    };
    if (persist) {
      await prisma.assistantMessage.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          body: result.reply,
          layer: "handoff",
          confidence: 1,
        },
      });
    }
    return result;
  }

  if (wantsHandoff(message, config)) {
    trace.push({ step: "handoff_keyword" });
    if (conversation) {
      await prisma.assistantConversation.update({
        where: { id: conversation.id },
        data: { status: "handoff" },
      });
    }
    const result: AssistantPipelineResult = {
      reply: HANDOFF_REPLY,
      layer: "handoff",
      confidence: 1,
      handoff: true,
      conversationId: conversation?.id ?? "",
      trace,
      sources: [],
    };
    if (persist && conversation) {
      await prisma.assistantMessage.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          body: result.reply,
          layer: "handoff",
          confidence: 1,
        },
      });
    }
    return result;
  }

  const sources = await searchAssistantKnowledge(input.siteId, message, input.channel);
  const topScore = sources[0]?.score ?? 0;
  trace.push({
    step: "knowledge_search",
    detail: `${sources.length} eşleşme`,
    score: topScore,
  });

  if (topScore >= config.knowledgeMinScore) {
    const reply = formatKnowledgeReply(sources);
    const result: AssistantPipelineResult = {
      reply,
      layer: "knowledge",
      confidence: topScore,
      handoff: false,
      conversationId: conversation?.id ?? "",
      trace,
      sources,
    };
    if (persist && conversation) {
      await prisma.assistantMessage.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          body: reply,
          layer: "knowledge",
          confidence: topScore,
          metadataJson: JSON.stringify({ sourceIds: sources.map((s) => s.id) }),
        },
      });
    }
    return result;
  }

  const shouldTryAi =
    config.aiEnabled &&
    (!config.aiOnlyWhenNoKnowledge || topScore < config.knowledgeMinScore);

  if (shouldTryAi) {
    trace.push({ step: "ai_attempt" });
    const history = conversation
      ? (await loadRecentMessages(conversation.id)).reverse()
      : [];
    const { reply, provider } = await generateAssistantAiReply(
      input.siteId,
      config,
      message,
      sources,
      history,
    );
    if (reply) {
      trace.push({ step: "ai_success", detail: provider ?? undefined });
      const confidence = Math.max(topScore, 0.55);
      const result: AssistantPipelineResult = {
        reply,
        layer: "ai",
        confidence,
        handoff: false,
        conversationId: conversation?.id ?? "",
        trace,
        sources,
      };
      if (persist && conversation) {
        await prisma.assistantMessage.create({
          data: {
            conversationId: conversation.id,
            role: "assistant",
            body: reply,
            layer: "ai",
            confidence,
            metadataJson: JSON.stringify({
              provider,
              sourceIds: sources.map((s) => s.id),
            }),
          },
        });
      }
      return result;
    }
    trace.push({ step: "ai_failed" });
  }

  const lowStreak = conversation
    ? await countRecentLowConfidence(conversation.id, config.handoffAfterLowConfidence)
    : 0;

  if (lowStreak >= config.handoffAfterLowConfidence - 1) {
    trace.push({ step: "handoff_low_confidence" });
    if (conversation) {
      await prisma.assistantConversation.update({
        where: { id: conversation.id },
        data: { status: "handoff" },
      });
    }
    const result: AssistantPipelineResult = {
      reply: HANDOFF_REPLY,
      layer: "handoff",
      confidence: topScore,
      handoff: true,
      conversationId: conversation?.id ?? "",
      trace,
      sources,
    };
    if (persist && conversation) {
      await prisma.assistantMessage.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          body: result.reply,
          layer: "handoff",
          confidence: topScore,
        },
      });
    }
    return result;
  }

  const fallback =
    "Bu konuda net bir bilgi bulamadım. İsterseniz sizi canlı destek ekibimize bağlayabilirim — “temsilci” yazmanız yeterli.";

  const result: AssistantPipelineResult = {
    reply: fallback,
    layer: "rule",
    confidence: topScore,
    handoff: false,
    conversationId: conversation?.id ?? "",
    trace,
    sources,
  };

  if (persist && conversation) {
    await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        body: fallback,
        layer: "rule",
        confidence: topScore,
      },
    });
  }

  return result;
}

/** Admin panel test mesajı */
export async function runAssistantTestMessage(
  siteId: string,
  message: string,
  externalUserId = "admin-test",
): Promise<AssistantPipelineResult> {
  return runAssistantPipeline({
    siteId,
    channel: "test",
    externalUserId,
    message,
    persist: true,
  });
}
