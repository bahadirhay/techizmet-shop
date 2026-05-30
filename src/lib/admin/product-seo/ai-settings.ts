import "server-only";

import type { SeoAiProvider, StoreSeoAiSettings } from "@/lib/site-settings";
import { getSiteSettings } from "@/lib/site-settings";

export type ResolvedSeoAiConfig = {
  enabled: boolean;
  provider: SeoAiProvider;
  geminiApiKey: string;
  openaiApiKey: string;
  claudeApiKey: string;
  geminiModel: string;
  openaiModel: string;
  claudeModel: string;
};

export function parseSeoAiSettings(raw: StoreSeoAiSettings | undefined): ResolvedSeoAiConfig {
  const s = raw ?? {};
  return {
    enabled: s.enabled !== false,
    provider: s.provider ?? "auto",
    geminiApiKey: (s.geminiApiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || ""),
    openaiApiKey: (s.openaiApiKey?.trim() || process.env.OPENAI_API_KEY?.trim() || ""),
    claudeApiKey: (s.claudeApiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim() || ""),
    geminiModel: s.geminiModel?.trim() || process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash",
    openaiModel: s.openaiModel?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    claudeModel: s.claudeModel?.trim() || process.env.CLAUDE_MODEL?.trim() || "claude-3-5-haiku-latest",
  };
}

export async function getSeoAiConfig(siteId: string): Promise<ResolvedSeoAiConfig> {
  const settings = await getSiteSettings(siteId);
  return parseSeoAiSettings(settings.seoAi);
}

export function seoAiAvailable(config: ResolvedSeoAiConfig): {
  gemini: boolean;
  openai: boolean;
  claude: boolean;
  any: boolean;
} {
  const gemini = Boolean(config.geminiApiKey);
  const openai = Boolean(config.openaiApiKey);
  const claude = Boolean(config.claudeApiKey);
  return {
    gemini,
    openai,
    claude,
    any: config.enabled && (gemini || openai || claude),
  };
}

export function providerOrder(config: ResolvedSeoAiConfig): ("gemini" | "openai" | "claude")[] {
  if (config.provider === "gemini") return ["gemini"];
  if (config.provider === "openai") return ["openai"];
  if (config.provider === "claude") return ["claude"];
  const order: ("gemini" | "openai" | "claude")[] = [];
  if (config.geminiApiKey) order.push("gemini");
  if (config.claudeApiKey) order.push("claude");
  if (config.openaiApiKey) order.push("openai");
  return order;
}
