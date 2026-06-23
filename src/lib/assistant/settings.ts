import type { SiteSettings } from "@/lib/site-settings";
import type { AssistantChannel } from "@/lib/assistant/types";

export type StoreAssistantChannelSettings = {
  enabled?: boolean;
};

export type StoreAssistantSettings = {
  /** Asistan motoru açık */
  enabled?: boolean;
  /** Mağaza / marka adı (cevap tonu) */
  brandName?: string;
  /** Ek sistem talimatı */
  systemPrompt?: string;
  /** Bilgi tabanından cevap için minimum skor (0–1) */
  knowledgeMinScore?: number;
  /** AI katmanı */
  aiEnabled?: boolean;
  /** AI yalnızca bilgi tabanında yeterli eşleşme yoksa */
  aiOnlyWhenNoKnowledge?: boolean;
  /** Canlı destek anahtar kelimeleri */
  handoffKeywords?: string[];
  /** Üst üste düşük güven sonrası otomatik devret */
  handoffAfterLowConfidence?: number;
  /** Kanal bazlı aç/kapa */
  channels?: Partial<Record<AssistantChannel, StoreAssistantChannelSettings>>;
};

export type ResolvedAssistantConfig = {
  enabled: boolean;
  brandName: string;
  systemPrompt: string;
  knowledgeMinScore: number;
  aiEnabled: boolean;
  aiOnlyWhenNoKnowledge: boolean;
  handoffKeywords: string[];
  handoffAfterLowConfidence: number;
  channels: Record<AssistantChannel, { enabled: boolean }>;
};

const DEFAULT_HANDOFF_KEYWORDS = [
  "insan",
  "temsilci",
  "yetkili",
  "canlı",
  "operatör",
  "müşteri temsilcisi",
  "görüşmek istiyorum",
  "arayın",
];

const DEFAULT_CHANNELS: Record<AssistantChannel, { enabled: boolean }> = {
  whatsapp: { enabled: true },
  trendyol: { enabled: true },
  hepsiburada: { enabled: false },
  test: { enabled: true },
  web: { enabled: false },
};

export function parseAssistantSettings(
  raw: StoreAssistantSettings | undefined,
  siteName?: string,
): ResolvedAssistantConfig {
  const s = raw ?? {};
  const channels = { ...DEFAULT_CHANNELS };
  if (s.channels) {
    for (const [key, val] of Object.entries(s.channels)) {
      const ch = key as AssistantChannel;
      if (channels[ch]) {
        channels[ch] = { enabled: val?.enabled !== false };
      }
    }
  }
  return {
    enabled: s.enabled !== false,
    brandName: s.brandName?.trim() || siteName?.trim() || "Mağaza",
    systemPrompt: s.systemPrompt?.trim() || "",
    knowledgeMinScore:
      typeof s.knowledgeMinScore === "number"
        ? Math.min(1, Math.max(0, s.knowledgeMinScore))
        : 0.35,
    aiEnabled: s.aiEnabled !== false,
    aiOnlyWhenNoKnowledge: s.aiOnlyWhenNoKnowledge !== false,
    handoffKeywords:
      s.handoffKeywords?.map((k) => k.trim().toLowerCase()).filter(Boolean) ??
      DEFAULT_HANDOFF_KEYWORDS,
    handoffAfterLowConfidence:
      typeof s.handoffAfterLowConfidence === "number"
        ? Math.max(1, Math.min(10, s.handoffAfterLowConfidence))
        : 3,
    channels,
  };
}

export function getAssistantConfig(
  settings: SiteSettings,
  siteName?: string,
): ResolvedAssistantConfig {
  return parseAssistantSettings(settings.assistant, siteName);
}

export function isAssistantChannelEnabled(
  config: ResolvedAssistantConfig,
  channel: AssistantChannel,
): boolean {
  return config.enabled && (config.channels[channel]?.enabled ?? false);
}
