import "server-only";

import type { ResolvedSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import { providerOrder, seoAiAvailable } from "@/lib/admin/product-seo/ai-settings";

export type AiSeoCopyInput = {
  title: string;
  categoryTitles: string[];
  brandTitle?: string;
  keywords: string[];
  competitorTitles: string[];
  siteName: string;
  existingDescription?: string;
};

export type AiSeoCopyResult = {
  used: boolean;
  provider?: "gemini" | "openai" | "claude" | "template";
  message: string;
  description?: string;
  descriptionHtml?: string;
  keyFeaturesHtml?: string;
  seoDescription?: string;
};

type AiPayload = {
  description: string;
  keyFeatures: string;
  seoDescription: string;
};

function parseAiJson(text: string): AiPayload | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const o = JSON.parse(jsonMatch[0]) as Partial<AiPayload>;
    if (!o.description) return null;
    return {
      description: String(o.description).trim(),
      keyFeatures: String(o.keyFeatures ?? "").trim(),
      seoDescription: String(o.seoDescription ?? o.description).trim().slice(0, 160),
    };
  } catch {
    return null;
  }
}

function buildPrompt(input: AiSeoCopyInput): string {
  return `Sen Türkiye e-ticaret SEO uzmanısın. JSON döndür, başka metin yazma.

Ürün: ${input.title}
Marka: ${input.brandTitle ?? "—"}
Kategori: ${input.categoryTitles.join(" > ") || "—"}
Site: ${input.siteName}
Anahtar kelimeler: ${input.keywords.slice(0, 8).join(", ") || "—"}
Rakip başlıklar (Trendyol/HB): ${input.competitorTitles.slice(0, 5).join(" | ") || "—"}
Mevcut açıklama: ${input.existingDescription?.slice(0, 200) ?? "—"}

Şu JSON formatında yanıt ver:
{
  "description": "2-3 cümle kısa Türkçe ürün tanıtımı",
  "keyFeatures": "Her satır bir madde, 4-6 madde, - ile başlasın",
  "seoDescription": "max 155 karakter meta açıklama"
}

Kurallar: Türkçe, doğal, abartısız. Pazaryeri ve Google uyumlu.`;
}

function templateCopy(input: AiSeoCopyInput): AiPayload {
  const brand = input.brandTitle?.trim();
  const cat = input.categoryTitles[0] ?? "ürün";
  const kw = input.keywords.slice(0, 3).join(", ");
  const name = brand ? `${brand} ${input.title}` : input.title;

  const description = `${name}, ${cat} kategorisinde ${input.siteName} güvenilir alışveriş deneyimi sunar.${
    kw ? ` ${kw} aramaları için uygun formül.` : ""
  } Hızlı kargo ve güvenli ödeme.`;

  const keyFeatures = [
    `- ${cat} kategorisinde özenle seçilmiş formül`,
    brand ? `- ${brand} marka güvencesi` : `- Kaliteli içerik`,
    `- Online ve pazaryeri satışına uygun ürün adı`,
    kw ? `- SEO: ${input.keywords.slice(0, 2).join(", ")}` : `- Günlük kullanıma uygun`,
    `- ${input.siteName} hızlı teslimat`,
  ].join("\n");

  return {
    description,
    keyFeatures,
    seoDescription: description.slice(0, 155),
  };
}

function successResult(
  provider: "gemini" | "openai" | "claude",
  label: string,
  parsed: AiPayload,
): AiSeoCopyResult {
  return {
    used: true,
    provider,
    message: `${label} ile üretildi`,
    description: parsed.description,
    descriptionHtml: parsed.description,
    keyFeaturesHtml: parsed.keyFeatures,
    seoDescription: parsed.seoDescription,
  };
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(25000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callOpenAi(prompt: string, apiKey: string, model: string): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(25000),
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}

async function callClaude(prompt: string, apiKey: string, model: string): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(25000),
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const block = data.content?.find((c) => c.type === "text");
  return block?.text ?? null;
}

async function tryProvider(
  name: "gemini" | "openai" | "claude",
  prompt: string,
  config: ResolvedSeoAiConfig,
): Promise<AiSeoCopyResult | null> {
  if (name === "gemini" && config.geminiApiKey) {
    const raw = await callGemini(prompt, config.geminiApiKey, config.geminiModel);
    const parsed = raw ? parseAiJson(raw) : null;
    if (parsed) return successResult("gemini", "Google Gemini", parsed);
  }
  if (name === "openai" && config.openaiApiKey) {
    const raw = await callOpenAi(prompt, config.openaiApiKey, config.openaiModel);
    const parsed = raw ? parseAiJson(raw) : null;
    if (parsed) return successResult("openai", "OpenAI", parsed);
  }
  if (name === "claude" && config.claudeApiKey) {
    const raw = await callClaude(prompt, config.claudeApiKey, config.claudeModel);
    const parsed = raw ? parseAiJson(raw) : null;
    if (parsed) return successResult("claude", "Claude (Anthropic)", parsed);
  }
  return null;
}

export function aiSeoAvailableFromConfig(config: ResolvedSeoAiConfig) {
  return seoAiAvailable(config);
}

export async function generateAiSeoCopy(
  input: AiSeoCopyInput,
  config: ResolvedSeoAiConfig,
): Promise<AiSeoCopyResult> {
  const prompt = buildPrompt(input);
  const avail = seoAiAvailable(config);

  if (config.enabled && avail.any) {
    for (const p of providerOrder(config)) {
      const result = await tryProvider(p, prompt, config);
      if (result) return result;
    }
  }

  const tpl = templateCopy(input);
  return {
    used: false,
    provider: "template",
    message: avail.any
      ? "AI yanıt alınamadı — şablon metin kullanıldı"
      : "AI kapalı veya API anahtarı yok — Ayarlar → SEO AI bölümünden Gemini, Claude veya OpenAI ekleyin",
    description: tpl.description,
    descriptionHtml: tpl.description,
    keyFeaturesHtml: tpl.keyFeatures,
    seoDescription: tpl.seoDescription,
  };
}
