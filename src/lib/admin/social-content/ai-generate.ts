import "server-only";

import type { ResolvedSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import { providerOrder, seoAiAvailable } from "@/lib/admin/product-seo/ai-settings";
import type { SocialContentPack, SocialPlatform } from "@/lib/admin/social-content/types";
import { SOCIAL_PLATFORMS } from "@/lib/admin/social-content/types";
import type { SocialCreativeBrief } from "@/lib/admin/social-content/creative-brief";
import type { SocialProductContext } from "@/lib/admin/social-content/product-context";

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

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function tags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 25);
}

function parsePlatformBlock(o: Record<string, unknown> | undefined): SocialContentPack[SocialPlatform] {
  if (!o) return { hashtags: [] };
  return {
    title: str(o.title) || undefined,
    caption: str(o.caption) || undefined,
    hook: str(o.hook) || undefined,
    script: str(o.script) || undefined,
    body: str(o.body) || str(o.post) || undefined,
    hashtags: tags(o.hashtags),
    cta: str(o.cta) || undefined,
  };
}

function parseSocialPackJson(text: string): SocialContentPack | null {
  const o = parseJsonObject(text);
  if (!o) return null;
  const pack = {} as SocialContentPack;
  for (const platform of SOCIAL_PLATFORMS) {
    const block = o[platform];
    pack[platform] = parsePlatformBlock(
      block && typeof block === "object" ? (block as Record<string, unknown>) : undefined,
    );
  }
  const hasContent = SOCIAL_PLATFORMS.some(
    (p) =>
      pack[p].caption ||
      pack[p].body ||
      pack[p].script ||
      pack[p].hook ||
      pack[p].title,
  );
  return hasContent ? pack : null;
}

function buildPrompt(
  ctx: SocialProductContext,
  siteName: string,
  productUrl: string,
  brief?: SocialCreativeBrief,
): string {
  const briefBlock = brief
    ? `
YARATICI BRİF:
- Açı: ${brief.productAngle}
- Hedef: ${brief.targetPet} sahipleri
- Görsel sahne: ${brief.visualScene}
- Ton: ${brief.mood}
- Hook fikirleri: ${brief.hooks.join(" | ")}
`
    : "";

  return `Sen bir e-ticaret sosyal medya içerik uzmanısın. Pet shop markası "${siteName}" için ürün tanıtım metinleri yaz.
${briefBlock}
ÜRÜN:
- Ad: ${ctx.title}
- Fiyat: ${ctx.priceLabel}${ctx.compareAtLabel ? ` (eski: ${ctx.compareAtLabel})` : ""}
- Kategori: ${ctx.categoryTitle ?? "—"}
- Marka: ${ctx.brandTitle ?? "—"}
- Açıklama: ${ctx.description || "—"}
- Ürün linki: ${productUrl}
${ctx.campaignNote ? `- Aktif kampanya: ${ctx.campaignNote}` : ""}

KURALLAR:
- Türkçe yaz
- Veteriner onayı / tedavi iddiası YAPMA
- Emoji kullanabilirsin ama abartma
- Her platform için uygun ton
- Hashtag'ler # işareti OLMADAN dizi olarak

Yanıtı YALNIZCA şu JSON olarak ver:
{
  "instagram": { "caption": "150-300 karakter", "hashtags": ["evcilhayvan", "..."], "cta": "kısa CTA" },
  "tiktok": { "hook": "ilk 3 sn dikkat cümlesi", "script": "15-40 sn konuşma metni", "caption": "kısa açıklama", "hashtags": ["..."] },
  "youtube": { "title": "max 60 karakter", "body": "Shorts açıklaması 2-3 cümle", "script": "30 sn video metni", "hashtags": ["etiket1"] },
  "linkedin": { "body": "profesyonel 3 paragraf", "hashtags": ["..."], "cta": "ürün linki CTA" }
}`;
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
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
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Yalnızca geçerli JSON döndür." },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
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
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return data.content?.find((c) => c.type === "text")?.text?.trim() ?? null;
}

export function templatePack(ctx: SocialProductContext, siteName: string, productUrl: string): SocialContentPack {
  const price = ctx.priceLabel;
  const baseTags = ["evcilhayvan", "petshop", "anatolianpaw", ctx.slug.replace(/-/g, "")].filter(Boolean);
  const cta = `🔗 ${productUrl}`;
  const cap = `${ctx.title} — ${price}${ctx.compareAtLabel ? ` (eski fiyat ${ctx.compareAtLabel})` : ""}. ${siteName} güvencesiyle kapınıza gelsin. ${ctx.campaignNote ? `🎁 ${ctx.campaignNote}` : ""}`.trim();

  return {
    instagram: {
      caption: cap.slice(0, 300),
      hashtags: [...baseTags, "instagram", "köpek", "kedi"].slice(0, 18),
      cta: "Bio linkinden sipariş verin",
    },
    tiktok: {
      hook: `${ctx.title} hâlâ bu fiyata mı? 😳`,
      script: `Merhaba! Bugün ${ctx.title} tanıtıyorum. Fiyatı ${price}. ${ctx.description.slice(0, 120)} Detaylar ve sipariş için profile tıkla.`,
      caption: `${ctx.title} | ${price}`,
      hashtags: [...baseTags, "tiktok", "pet"].slice(0, 12),
    },
    youtube: {
      title: `${ctx.title} | ${siteName}`.slice(0, 60),
      body: `${ctx.title} — ${price}\n\n${ctx.description.slice(0, 200)}\n\nSipariş: ${productUrl}`,
      script: `Selam! ${ctx.title} kısa inceleme. Fiyat ${price}. ${ctx.campaignNote ? `Şu an ${ctx.campaignNote}. ` : ""}Link açıklamada.`,
      hashtags: [...baseTags, "shorts", "petshop"].slice(0, 8),
      cta,
    },
    linkedin: {
      body: `${ctx.title}\n\n${ctx.description.slice(0, 280) || `${siteName} evcil hayvan ürün kataloğunda yer alan bu ürün, ${price} fiyatla sunuluyor.`}\n\n${ctx.campaignNote ? `Kampanya: ${ctx.campaignNote}\n\n` : ""}Detaylı bilgi ve sipariş için:`,
      hashtags: [...baseTags, "linkedin", "ecommerce", "petcare"].slice(0, 8),
      cta: productUrl,
    },
  };
}

export async function generateSocialContentPack(params: {
  ctx: SocialProductContext;
  siteName: string;
  productUrl: string;
  aiConfig: ResolvedSeoAiConfig;
  brief?: SocialCreativeBrief;
}): Promise<{ pack: SocialContentPack; aiProvider: string; message: string }> {
  const { ctx, siteName, productUrl, aiConfig, brief } = params;
  const prompt = buildPrompt(ctx, siteName, productUrl, brief);

  if (aiConfig.enabled && seoAiAvailable(aiConfig).any) {
    for (const provider of providerOrder(aiConfig)) {
      let raw: string | null = null;
      if (provider === "gemini" && aiConfig.geminiApiKey) {
        raw = await callGemini(prompt, aiConfig.geminiApiKey, aiConfig.geminiModel);
      } else if (provider === "openai" && aiConfig.openaiApiKey) {
        raw = await callOpenAi(prompt, aiConfig.openaiApiKey, aiConfig.openaiModel);
      } else if (provider === "claude" && aiConfig.claudeApiKey) {
        raw = await callClaude(prompt, aiConfig.claudeApiKey, aiConfig.claudeModel);
      }
      if (!raw) continue;
      const pack = parseSocialPackJson(raw);
      if (pack) {
        const label =
          provider === "gemini" ? "Gemini" : provider === "openai" ? "OpenAI" : "Claude";
        return { pack, aiProvider: provider, message: `${label} ile üretildi` };
      }
    }
  }

  return {
    pack: templatePack(ctx, siteName, productUrl),
    aiProvider: "template",
    message: "Şablon metin (AI anahtarı yok veya yanıt geçersiz)",
  };
}
