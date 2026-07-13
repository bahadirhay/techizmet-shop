import "server-only";

import type { ResolvedSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import { providerOrder, seoAiAvailable } from "@/lib/admin/product-seo/ai-settings";
import type { SocialProductContext } from "@/lib/admin/social-content/product-context";
import type { SocialPerformanceHints } from "@/lib/admin/social-content/social-performance";

export type SocialCreativeBrief = {
  productAngle: string;
  targetPet: string;
  visualScene: string;
  mood: string;
  hooks: string[];
  avoid: string[];
};

export type SocialImageAspect = "square" | "portrait" | "landscape";

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

function strList(v: unknown, max = 5): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function parseSocialCreativeBrief(raw: string | null | undefined): SocialCreativeBrief | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o.productAngle && !o.visualScene) return null;
    return {
      productAngle: String(o.productAngle ?? "").trim() || "doğal pet ödülü",
      targetPet: String(o.targetPet ?? "köpek").trim() || "köpek",
      visualScene: String(o.visualScene ?? "").trim() || "mutlu evcil hayvan ve doğal ödül",
      mood: String(o.mood ?? "sıcak, güven verici").trim(),
      hooks: strList(o.hooks, 4),
      avoid: strList(o.avoid, 6),
    };
  } catch {
    return null;
  }
}

export function serializeSocialCreativeBrief(brief: SocialCreativeBrief): string {
  return JSON.stringify(brief);
}

export function templateSocialCreativeBrief(ctx: SocialProductContext): SocialCreativeBrief {
  const lower = `${ctx.title} ${ctx.description} ${ctx.categoryTitle ?? ""}`.toLocaleLowerCase("tr");
  const targetPet = /kedi|cat/.test(lower) ? "kedi" : "köpek";
  return {
    productAngle: ctx.description.slice(0, 120) || `${ctx.title} — doğal ve güvenilir pet ödülü`,
    targetPet,
    visualScene: `Mutlu ${targetPet} doğal ışıkta, ürün paketi veya ödül maması ile lifestyle sahne`,
    mood: "sıcak, doğal, güven verici, premium pet shop",
    hooks: [
      `${ctx.title} ile eğitim ödülü`,
      `Doğal içerik arayan ${targetPet} sahipleri için`,
    ],
    avoid: ["veteriner tedavi iddiası", "metin", "logo", "watermark", "insan yüzü"],
  };
}

function buildBriefPrompt(
  ctx: SocialProductContext,
  siteName: string,
  hints?: SocialPerformanceHints,
): string {
  const perfBlock = hints?.available
    ? `
GEÇMİŞ PERFORMANS (yüksek etkileşimli gönderilerden):
- Ortalama erişim: ${hints.avgReach ?? "—"}
- İşe yarayan hook'lar: ${hints.topHooks.join(" | ") || "—"}
- Güçlü açılar: ${hints.strongAngles.join(" | ") || "—"}
- Tercih edilen ton: ${hints.preferredMoods.join(", ") || "—"}
Bu ipuçlarını yeni brifte uyarla ama ürünü doğru yansıt.`
    : "";

  return `Pet shop markası "${siteName}" için sosyal medya yaratıcı brifing JSON'u üret.
${perfBlock}

ÜRÜN:
- Ad: ${ctx.title}
- Fiyat: ${ctx.priceLabel}
- Kategori: ${ctx.categoryTitle ?? "—"}
- Açıklama: ${ctx.description || "—"}

Yanıt YALNIZCA JSON:
{
  "productAngle": "ürünün tek cümle satış açısı",
  "targetPet": "köpek veya kedi",
  "visualScene": "AI görsel için sahne tarifi (ürün + pet, lifestyle)",
  "mood": "görsel ruh hali",
  "hooks": ["dikkat çekici hook 1", "hook 2"],
  "avoid": ["kaçınılacaklar"]
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
        generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(60_000),
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
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Yalnızca geçerli JSON döndür." },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

function parseBriefJson(text: string): SocialCreativeBrief | null {
  const o = parseJsonObject(text);
  if (!o) return null;
  const brief: SocialCreativeBrief = {
    productAngle: String(o.productAngle ?? "").trim(),
    targetPet: String(o.targetPet ?? "köpek").trim(),
    visualScene: String(o.visualScene ?? "").trim(),
    mood: String(o.mood ?? "").trim(),
    hooks: strList(o.hooks),
    avoid: strList(o.avoid),
  };
  if (!brief.productAngle || !brief.visualScene) return null;
  return brief;
}

export async function generateSocialCreativeBrief(params: {
  ctx: SocialProductContext;
  siteName: string;
  aiConfig: ResolvedSeoAiConfig;
  performanceHints?: SocialPerformanceHints;
}): Promise<{ brief: SocialCreativeBrief; source: string }> {
  const { ctx, siteName, aiConfig, performanceHints } = params;
  const prompt = buildBriefPrompt(ctx, siteName, performanceHints);

  if (aiConfig.enabled && seoAiAvailable(aiConfig).any) {
    for (const provider of providerOrder(aiConfig)) {
      let raw: string | null = null;
      if (provider === "gemini" && aiConfig.geminiApiKey) {
        raw = await callGemini(prompt, aiConfig.geminiApiKey, aiConfig.geminiModel);
      } else if (provider === "openai" && aiConfig.openaiApiKey) {
        raw = await callOpenAi(prompt, aiConfig.openaiApiKey, aiConfig.openaiModel);
      }
      if (!raw) continue;
      const brief = parseBriefJson(raw);
      if (brief) {
        if (performanceHints?.available) {
          const { applyPerformanceHintsToBrief } = await import(
            "@/lib/admin/social-content/social-performance"
          );
          return { brief: applyPerformanceHintsToBrief(brief, performanceHints), source: provider };
        }
        return { brief, source: provider };
      }
    }
  }

  const { applyPerformanceHintsToBrief } = await import("@/lib/admin/social-content/social-performance");
  const templateBrief = templateSocialCreativeBrief(ctx);
  return {
    brief: performanceHints?.available
      ? applyPerformanceHintsToBrief(templateBrief, performanceHints)
      : templateBrief,
    source: "template",
  };
}

export function buildSocialImagePrompt(params: {
  brief: SocialCreativeBrief;
  ctx: SocialProductContext;
  siteName: string;
  aspect: SocialImageAspect;
}): string {
  const { brief, ctx, siteName, aspect } = params;
  const aspectHint =
    aspect === "portrait"
      ? "Vertical 9:16 social media composition, mobile-first."
      : aspect === "landscape"
        ? "Horizontal 16:9 composition."
        : "Square 1:1 Instagram post composition.";

  const productHint = ctx.imageUrls[0]
    ? `Product reference: natural pet treat "${ctx.title}" similar to premium dried snack packaging.`
    : `Product: "${ctx.title}" natural pet treat, premium packaging implied.`;

  return [
    `Professional social media product photo for ${siteName} pet shop.`,
    productHint,
    `Scene: ${brief.visualScene}.`,
    `Angle: ${brief.productAngle}.`,
    `Pet: happy ${brief.targetPet}.`,
    `Mood: ${brief.mood}.`,
    aspectHint,
    `Avoid: ${brief.avoid.join(", ")}.`,
    "Photorealistic, warm natural light, shallow depth of field.",
    "NO text, NO logos, NO watermark, NO price tags, NO human faces.",
  ].join(" ");
}

export function platformImageAspect(platform: string): SocialImageAspect {
  if (platform === "tiktok" || platform === "youtube") return "portrait";
  if (platform === "linkedin") return "landscape";
  return "square";
}
