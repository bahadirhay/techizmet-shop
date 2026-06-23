/** Asistan kanalları — her müşteri/site için ayrı açılabilir */
export type AssistantChannel = "whatsapp" | "trendyol" | "hepsiburada" | "test" | "web";

export type AssistantConversationStatus = "bot" | "handoff" | "closed";

export type AssistantMessageRole = "user" | "assistant" | "agent" | "system";

export type AssistantResponseLayer = "disabled" | "handoff" | "knowledge" | "ai" | "rule";

export type AssistantKnowledgeType =
  | "product"
  | "faq"
  | "manual"
  | "page"
  | "policy"
  | "custom";

export type PipelineTraceStep = {
  step: string;
  detail?: string;
  score?: number;
};

export type KnowledgeHit = {
  id: string;
  entryType: AssistantKnowledgeType;
  title: string;
  body: string;
  score: number;
  imageUrl?: string | null;
  sourceRef?: string | null;
};

export type AssistantPipelineResult = {
  reply: string;
  layer: AssistantResponseLayer;
  confidence: number;
  handoff: boolean;
  conversationId: string;
  trace: PipelineTraceStep[];
  sources: KnowledgeHit[];
};
