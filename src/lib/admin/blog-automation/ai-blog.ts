import "server-only";

import type { ResolvedSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import { providerOrder, seoAiAvailable } from "@/lib/admin/product-seo/ai-settings";
import type { BlogTopicProduct } from "@/lib/admin/blog-automation/topics";

export type AiBlogCopyInput = {
  keyword: string;
  siteName: string;
  author?: string;
  relatedProducts: BlogTopicProduct[];
  fixedTitle?: string;
  researchContext?: string;
};

export type AiBlogCopyResult = {
  used: boolean;
  provider?: "gemini" | "openai" | "claude" | "template";
  message: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  titleEn: string;
  excerptEn: string;
  bodyHtmlEn: string;
  seoTitle: string;
  seoDescription: string;
};

type TrPayload = {
  title: string;
  excerpt: string;
  bodyHtml: string;
  seoTitle: string;
  seoDescription: string;
};

type EnPayload = {
  titleEn: string;
  excerptEn: string;
  bodyHtmlEn: string;
};

const MIN_TR_BODY = 700;
const MIN_EN_BODY = 700;

const CLAUDE_MODEL_ALIASES: Record<string, string> = {
  "claude-3-5-haiku-latest": "claude-haiku-4-5-20251001",
  "claude-3-5-sonnet-latest": "claude-sonnet-4-6",
  "claude-sonnet-4-20250514": "claude-sonnet-4-6",
  "claude-3-5-haiku-20241022": "claude-haiku-4-5-20251001",
};

function claudeModelCandidates(configured: string): string[] {
  const trimmed = configured.trim();
  const mapped = CLAUDE_MODEL_ALIASES[trimmed] || trimmed;
  return [...new Set([mapped, "claude-sonnet-4-6", "claude-haiku-4-5-20251001"])];
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseTurkishJson(text: string): TrPayload | null {
  const o = parseJsonObject(text);
  if (!o) return null;
  const title = String(o.title ?? "").trim();
  const bodyHtml = String(o.bodyHtml ?? "").trim();
  if (!title || bodyHtml.length < MIN_TR_BODY) return null;
  return {
    title: title.slice(0, 120),
    excerpt: String(o.excerpt ?? "").trim().slice(0, 280),
    bodyHtml,
    seoTitle: String(o.seoTitle ?? title).trim().slice(0, 65),
    seoDescription: String(o.seoDescription ?? o.excerpt ?? "").trim().slice(0, 165),
  };
}

function parseEnglishJson(text: string): EnPayload | null {
  const o = parseJsonObject(text);
  if (!o) return null;
  const titleEn = String(o.titleEn ?? "").trim();
  const bodyHtmlEn = String(o.bodyHtmlEn ?? "").trim();
  if (!titleEn || bodyHtmlEn.length < MIN_EN_BODY) return null;
  return {
    titleEn: titleEn.slice(0, 120),
    excerptEn: String(o.excerptEn ?? "").trim().slice(0, 280),
    bodyHtmlEn,
  };
}

function topicLine(input: AiBlogCopyInput): string {
  return input.fixedTitle?.trim() || input.keyword;
}

function productLines(input: AiBlogCopyInput): string {
  return (
    input.relatedProducts.map((p) => `- ${p.title} (/products/${p.slug})`).join("\n") || "—"
  );
}

function buildTurkishPrompt(input: AiBlogCopyInput): string {
  const topic = topicLine(input);
  return `Sen deneyimli Türk evcil hayvan beslenmesi editörüsün. ${input.siteName} blogu için KONUYA ÖZEL derinlemesine Türkçe rehber yaz. Yalnızca geçerli JSON döndür.

KONU: ${topic}
Anahtar kelime: ${input.keyword}

MAĞAZA KAYNAK BİLGİSİ:
${input.researchContext || "—"}

Ürün linkleri:
${productLines(input)}

YASAK kalıplar: "araması mağazamızda sık görülüyor", "ürün etiketlerini karşılaştırarak ilerleyin", boş genel madde listeleri.

ZORUNLU bodyHtml içeriği:
- En az 650 kelime Türkçe
- En az 4 h2, 2 h3
- Konuyu somut anlat (nedir, nasıl üretilir, köpekler için faydalar, kimler için uygun/değil, porsiyon, karşılaştırma)
- En az 4 soruluk SSS (her cevap 2+ cümle, konuya özel)
- Ürün varsa /products/slug linki
- Abartılı tedavi iddiası yok; veteriner uyarısı gerektiğinde belirt

JSON (yalnızca bunu döndür):
{
  "title": ${input.fixedTitle?.trim() ? `"${input.fixedTitle.trim().replace(/"/g, '\\"')}"` : '"konuya uygun Türkçe başlık"'},
  "excerpt": "120-240 karakter özet",
  "bodyHtml": "<p>...</p><h2>...</h2>...",
  "seoTitle": "25-60 karakter meta başlık",
  "seoDescription": "120-160 karakter meta açıklama"
}

HTML: p, h2, h3, ul, ol, li, strong, a`;
}

function buildEnglishPrompt(input: AiBlogCopyInput, tr: TrPayload): string {
  return `Translate and adapt this Turkish pet shop blog article into natural English for ${input.siteName}. Keep the same structure (headings, lists, links). Yalnızca geçerli JSON döndür.

Turkish title: ${tr.title}
Turkish excerpt: ${tr.excerpt}

Turkish bodyHtml:
${tr.bodyHtml.slice(0, 12000)}

JSON:
{
  "titleEn": "natural English title",
  "excerptEn": "120-240 character excerpt",
  "bodyHtmlEn": "<p>...</p><h2>...</h2>... same sections in English"
}`;
}

type LlmResult = { text: string | null; error: string | null };

async function callGemini(prompt: string, apiKey: string, model: string): Promise<LlmResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.55, maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return { text: null, error: `Gemini HTTP ${res.status}: ${err.slice(0, 200)}` };
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  return text ? { text, error: null } : { text: null, error: "Gemini boş yanıt" };
}

async function callOpenAi(prompt: string, apiKey: string, model: string): Promise<LlmResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "Expert pet writer. Return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.55,
      max_tokens: 8192,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return { text: null, error: `OpenAI HTTP ${res.status}: ${err.slice(0, 200)}` };
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? null;
  return text ? { text, error: null } : { text: null, error: "OpenAI boş yanıt" };
}

async function callClaude(prompt: string, apiKey: string, model: string): Promise<LlmResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: "Expert Turkish pet nutrition writer. Return only valid JSON, no markdown fences.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return { text: null, error: `Claude HTTP ${res.status} (${model}): ${err.slice(0, 240)}` };
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((c) => c.type === "text")?.text ?? null;
  return text ? { text, error: null } : { text: null, error: `Claude boş yanıt (${model})` };
}

async function llmText(
  provider: "gemini" | "openai" | "claude",
  prompt: string,
  config: ResolvedSeoAiConfig,
): Promise<LlmResult> {
  if (provider === "gemini" && config.geminiApiKey) {
    return callGemini(prompt, config.geminiApiKey, config.geminiModel);
  }
  if (provider === "openai" && config.openaiApiKey) {
    return callOpenAi(prompt, config.openaiApiKey, config.openaiModel);
  }
  if (provider === "claude" && config.claudeApiKey) {
    const models = claudeModelCandidates(config.claudeModel);
    const errors: string[] = [];
    for (const model of models) {
      const r = await callClaude(prompt, config.claudeApiKey, model);
      if (r.text) return r;
      if (r.error) errors.push(r.error);
    }
    return { text: null, error: errors.join(" | ") || "Claude yanıt vermedi" };
  }
  return { text: null, error: `${provider} anahtarı yok` };
}

async function tryProviderBlog(
  name: "gemini" | "openai" | "claude",
  input: AiBlogCopyInput,
  config: ResolvedSeoAiConfig,
): Promise<{ result: AiBlogCopyResult } | { error: string }> {
  const trPrompt = buildTurkishPrompt(input);
  const trRaw = await llmText(name, trPrompt, config);
  if (!trRaw.text) {
    return { error: trRaw.error || `${name}: Türkçe üretim başarısız` };
  }
  const tr = parseTurkishJson(trRaw.text);
  if (!tr) {
    return {
      error: `${name}: Türkçe JSON geçersiz veya çok kısa (len=${trRaw.text.length}). Model uzun metin desteklemiyor olabilir.`,
    };
  }

  const enPrompt = buildEnglishPrompt(input, tr);
  const enRaw = await llmText(name, enPrompt, config);
  if (!enRaw.text) {
    return { error: enRaw.error || `${name}: İngilizce çeviri başarısız` };
  }
  const en = parseEnglishJson(enRaw.text);
  if (!en) {
    return {
      error: `${name}: İngilizce JSON geçersiz veya çok kısa (len=${enRaw.text.length})`,
    };
  }

  const label = name === "gemini" ? "Google Gemini" : name === "openai" ? "OpenAI" : "Claude";
  return {
    result: {
      used: true,
      provider: name,
      message: `${label} ile üretildi (2 adım)`,
      title: tr.title,
      excerpt: tr.excerpt,
      bodyHtml: tr.bodyHtml,
      titleEn: en.titleEn,
      excerptEn: en.excerptEn,
      bodyHtmlEn: en.bodyHtmlEn,
      seoTitle: tr.seoTitle,
      seoDescription: tr.seoDescription,
    },
  };
}

export class BlogAiGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlogAiGenerationError";
  }
}

export async function generateAiBlogCopy(
  input: AiBlogCopyInput,
  config: ResolvedSeoAiConfig,
  options?: { requireAi?: boolean },
): Promise<AiBlogCopyResult> {
  const avail = seoAiAvailable(config);

  if (config.enabled && avail.any) {
    const details: string[] = [];
    for (const p of providerOrder(config)) {
      const attempt = await tryProviderBlog(p, input, config);
      if ("result" in attempt) return attempt.result;
      details.push(attempt.error);
    }
    const msg =
      `AI içerik üretilemedi.\n` +
      details.map((d) => `• ${d}`).join("\n") +
      `\n\nAdmin → SEO AI: Claude model olarak claude-sonnet-4-6 yazın. Eski claude-3-5-* modelleri artık çalışmayabilir.`;
    if (options?.requireAi) throw new BlogAiGenerationError(msg);
    return {
      used: false,
      provider: "template",
      message: msg,
      title: input.fixedTitle?.trim() || input.keyword,
      excerpt: "",
      bodyHtml: "",
      titleEn: "",
      excerptEn: "",
      bodyHtmlEn: "",
      seoTitle: "",
      seoDescription: "",
    };
  }

  const msg =
    "AI kapalı veya anahtar tanımlı değil. Admin → SEO AI sayfasından Claude/Gemini/OpenAI anahtarı ekleyin.";
  if (options?.requireAi) throw new BlogAiGenerationError(msg);
  return {
    used: false,
    provider: "template",
    message: msg,
    title: input.fixedTitle?.trim() || input.keyword,
    excerpt: "",
    bodyHtml: "",
    titleEn: "",
    excerptEn: "",
    bodyHtmlEn: "",
    seoTitle: "",
    seoDescription: "",
  };
}

/** Admin panelinde bağlantı testi */
export async function testBlogAiProvider(
  config: ResolvedSeoAiConfig,
  provider: "claude" | "gemini" | "openai",
): Promise<{ ok: boolean; message: string }> {
  const sample: AiBlogCopyInput = {
    keyword: "köpek ödül maması",
    siteName: "Test",
    relatedProducts: [],
    researchContext: "Test ürün: kurutulmuş tavuk ayağı",
    fixedTitle: "Köpek ödül maması nasıl seçilir?",
  };
  const attempt = await tryProviderBlog(provider, sample, config);
  if ("result" in attempt) {
    return { ok: true, message: `${attempt.result.message} — ${attempt.result.title}` };
  }
  return { ok: false, message: attempt.error };
}
