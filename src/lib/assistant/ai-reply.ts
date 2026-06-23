import "server-only";

import {
  getSeoAiConfig,
  providerOrder,
  seoAiAvailable,
} from "@/lib/admin/product-seo/ai-settings";
import type { ResolvedAssistantConfig } from "@/lib/assistant/settings";
import type { KnowledgeHit } from "@/lib/assistant/types";

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 800 },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
}

async function callOpenAi(prompt: string, apiKey: string, model: string): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

async function callClaude(prompt: string, apiKey: string, model: string): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return data.content?.find((c) => c.type === "text")?.text?.trim() ?? null;
}

function buildAssistantPrompt(input: {
  config: ResolvedAssistantConfig;
  userMessage: string;
  sources: KnowledgeHit[];
  history: { role: string; body: string }[];
}): string {
  const sourceBlock = input.sources.length
    ? input.sources
        .map(
          (s, i) =>
            `[Kaynak ${i + 1}: ${s.title}]\n${s.body.slice(0, 1200)}`,
        )
        .join("\n\n")
    : "Kaynak bulunamadı.";

  const historyBlock = input.history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Müşteri" : "Asistan"}: ${m.body}`)
    .join("\n");

  return `Sen ${input.config.brandName} müşteri destek asistanısın. Türkçe, kısa ve net cevap ver.
Yalnızca verilen kaynaklara dayan; emin değilsen bunu söyle ve canlı desteğe yönlendir.
Fiyat, stok ve ürün özelliklerini kaynaklardan değiştirme.

${input.config.systemPrompt ? `Ek talimat: ${input.config.systemPrompt}\n` : ""}
--- Kaynaklar ---
${sourceBlock}

--- Son mesajlar ---
${historyBlock || "(yok)"}

--- Yeni müşteri mesajı ---
${input.userMessage}

Cevap (en fazla 3 kısa paragraf):`;
}

export async function generateAssistantAiReply(
  siteId: string,
  config: ResolvedAssistantConfig,
  userMessage: string,
  sources: KnowledgeHit[],
  history: { role: string; body: string }[],
): Promise<{ reply: string | null; provider: string | null }> {
  const aiConfig = await getSeoAiConfig(siteId);
  const avail = seoAiAvailable(aiConfig);
  if (!config.aiEnabled || !avail.any) {
    return { reply: null, provider: null };
  }

  const prompt = buildAssistantPrompt({ config, userMessage, sources, history });

  for (const p of providerOrder(aiConfig)) {
    if (p === "gemini" && aiConfig.geminiApiKey) {
      const reply = await callGemini(prompt, aiConfig.geminiApiKey, aiConfig.geminiModel);
      if (reply) return { reply, provider: "gemini" };
    }
    if (p === "openai" && aiConfig.openaiApiKey) {
      const reply = await callOpenAi(prompt, aiConfig.openaiApiKey, aiConfig.openaiModel);
      if (reply) return { reply, provider: "openai" };
    }
    if (p === "claude" && aiConfig.claudeApiKey) {
      const reply = await callClaude(prompt, aiConfig.claudeApiKey, aiConfig.claudeModel);
      if (reply) return { reply, provider: "claude" };
    }
  }

  return { reply: null, provider: null };
}
