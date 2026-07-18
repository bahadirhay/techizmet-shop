import "server-only";

import type { ResolvedSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import { providerOrder, seoAiAvailable } from "@/lib/admin/product-seo/ai-settings";
import {
  buildProfessionalPetProductDescription,
  ensurePrimaryPhrasesInDescription,
  getProductDescriptionPrimaryPhrases,
  isPetFoodContext,
} from "@/lib/admin/product-seo/content-builders";
import type { PetNutritionAnalysis } from "@/lib/admin/product-seo/nutrition-search";
import { buildPetNutritionKeyFeaturesBlock } from "@/lib/admin/product-seo/nutrition-search";
import { plainToAccordionHtml, plainToDescriptionHtml } from "@/lib/product-content-format";

export type AiSeoCopyInput = {
  title: string;
  categoryTitles: string[];
  brandTitle?: string;
  keywords: string[];
  competitorTitles: string[];
  siteName: string;
  existingDescription?: string;
  nutrition?: PetNutritionAnalysis | null;
};

export type AiSeoCopyResult = {
  used: boolean;
  provider?: "gemini" | "openai" | "claude" | "template";
  message: string;
  description?: string;
  descriptionHtml?: string;
  keyFeaturesHtml?: string;
  howToUseHtml?: string;
  seoTitle?: string;
  seoDescription?: string;
};

type AiPayload = {
  description: string;
  keyFeatures: string;
  howToUse: string;
  seoTitle?: string;
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
      howToUse: String(o.howToUse ?? "").trim(),
      seoTitle: o.seoTitle ? String(o.seoTitle).trim().slice(0, 65) : undefined,
      seoDescription: String(o.seoDescription ?? o.description).trim().slice(0, 160),
    };
  } catch {
    return null;
  }
}

function buildPrompt(input: AiSeoCopyInput): string {
  const pet = isPetFoodContext(input.title, input.categoryTitles);
  const primaryPhrases = getProductDescriptionPrimaryPhrases();
  const nutritionBlock =
    input.nutrition && input.nutrition.source !== "none"
      ? [
          input.nutrition.protein != null ? `Ham protein: ${input.nutrition.protein}%` : null,
          input.nutrition.fat != null ? `Ham yağ: ${input.nutrition.fat}%` : null,
          input.nutrition.fiber != null ? `Ham selüloz: ${input.nutrition.fiber}%` : null,
          input.nutrition.moisture != null ? `Nem: ${input.nutrition.moisture}%` : null,
          input.nutrition.ash != null ? `Kül: ${input.nutrition.ash}%` : null,
        ]
          .filter(Boolean)
          .join(", ")
      : "—";

  return `Sen Türkiye e-ticaret SEO ve ürün içerik uzmanısın. Yalnızca JSON döndür.
Metin hem web mağazasında hem Trendyol / Hepsiburada / Amazon açıklamasında kullanılacak — profesyonel, satışa dönük, spam'sız yaz.

Ürün: ${input.title}
Marka: ${input.brandTitle ?? "—"}
Kategori: ${input.categoryTitles.join(" > ") || "—"}
Site: ${input.siteName}
Anahtar kelimeler: ${input.keywords.slice(0, 10).join(", ") || "—"}
Rakip başlıklar (Trendyol/HB): ${input.competitorTitles.slice(0, 6).join(" | ") || "—"}
Mevcut açıklama: ${input.existingDescription?.slice(0, 300) ?? "—"}
Ürün tipi: ${pet ? "Pet food / ödül maması — besin değerleri zorunlu" : "Genel e-ticaret"}
${pet ? `Web'den bulunan besin değerleri (varsa bunları keyFeatures'a aynen yaz): ${nutritionBlock}` : ""}
${
  pet
    ? `ZORUNLU (description alanında birebir geçmeli, küçük/büyük harf serbest): ${primaryPhrases.map((p) => `"${p}"`).join(", ")}`
    : ""
}

JSON formatı:
{
  "seoTitle": "max 60 karakter Google meta başlık — ürün | marka | site",
  "seoDescription": "120-155 karakter meta açıklama, CTA ile${pet ? " — mümkünse 'köpek ödül maması' veya 'doğal köpek ödül maması' geçsin" : ""}",
  "description": "3-5 cümle profesyonel ürün tanıtımı — fayda, kullanım, güven; keyword stuffing YASAK",
  "keyFeatures": "Madde madde; pet food ise 'Besin Değerleri' bölümü: protein, yağ, ham selüloz, nem, kül (%)",
  "howToUse": "Kullanım / veriliş miktarı, saklama, yaş grubu uyarıları"
}

Kurallar:
- Türkçe, doğal, abartısız; "Tek ingredient", "özenle hazırlanmış" gibi zayıf/jenerik kalıplardan kaçın
- Pet food: katkısız/doğal, tahılsız, eğitim ödülü, günlük porsiyon sınırı (%10)
- Ürün adındaki ana içeriği (dana, tavuk, deve derisi, akciğer vb.) ASLA değiştirme veya başka ürün adı ekleme
- Açıklamalarda yalnızca "${input.title}" ürününü anlat; farklı ödül türleri ekleme
- keyFeatures ve howToUse düz metin; satır başına madde (- veya numara)
- seoDescription en az 100 karakter
- description en az 280 karakter; web + pazaryeri için yeterli uzunluk`;
}

function templateCopy(input: AiSeoCopyInput): AiPayload {
  const brand = input.brandTitle?.trim();
  const cat = input.categoryTitles[0] ?? "ürün";
  const kw = input.keywords.slice(0, 3).join(", ");
  const name = brand ? `${brand} ${input.title}` : input.title;
  const pet = isPetFoodContext(input.title, input.categoryTitles);

  const description = pet
    ? buildProfessionalPetProductDescription({
        productTitle: input.title,
        brandTitle: input.brandTitle,
        categoryTitles: input.categoryTitles,
        siteName: input.siteName,
      })
    : `${name}, ${cat} kategorisinde kalite ve güveni bir araya getirir.${kw ? ` ${kw} arayanlar için uygun formül.` : ""} ${input.siteName} üzerinden hızlı kargo ve güvenli ödeme ile sipariş verebilirsiniz.`;

  const keyFeatures = pet
    ? buildPetNutritionKeyFeaturesBlock({
        title: input.title,
        brandTitle: input.brandTitle,
        siteName: input.siteName,
        nutrition: input.nutrition ?? null,
      })
    : [
        `- ${cat} kategorisinde özenle seçilmiş formül`,
        brand ? `- ${brand} marka güvencesi` : `- Güvenilir içerik ve kalite`,
        `- Google ve pazaryeri aramalarına uygun ürün adı`,
        kw ? `- SEO: ${input.keywords.slice(0, 2).join(", ")}` : `- Günlük kullanıma uygun`,
        `- ${input.siteName} hızlı teslimat`,
        `- Müşteri memnuniyeti odaklı satış`,
      ].join("\n");

  const howToUse = pet
    ? [
        `1. Günlük ödül miktarını köpeğinizin kilosuna göre ayarlayın (aşırı vermeyin).`,
        `2. Ana mama öğünlerinin %10'unu geçmeyecek şekilde verin — bu bir ödül maması / köpek ödül maması ürünüdür.`,
        `3. Her zaman taze su bulundurun.`,
        `4. Serin ve kuru yerde, direkt güneş almayan ortamda saklayın.`,
        `5. Ambalaj açıldıktan sonra hava almayan kapta muhafaza edin.`,
        `6. Yavru / yaşlı / hassas dönemlerde veterinere danışın.`,
      ].join("\n")
    : [
        `1. Ürünü kullanım talimatına uygun şekilde uygulayın.`,
        `2. İlk kullanımda küçük miktarda test edin.`,
        `3. Çocukların erişemeyeceği yerde saklayın.`,
        `4. Orijinal ambalajında, kuru ve serin ortamda muhafaza edin.`,
      ].join("\n");

  const seoTitle = truncate(`${name} | ${brand ?? input.siteName}`, 60);
  const seoDescription = pet
    ? truncate(
        `${name} — doğal köpek ödül maması / köpek ödül maması. Tahılsız ödül maması; eğitim için. ${input.siteName}'da hızlı kargo.`,
        155,
      )
    : truncate(
        `${name} — ${cat}. Detaylı tanıtım ve güvenli alışveriş. ${input.siteName}'da hızlı kargo.`,
        155,
      );

  return { description, keyFeatures, howToUse, seoTitle, seoDescription };
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trim() + "…";
}

function toResult(
  provider: "gemini" | "openai" | "claude",
  label: string,
  parsed: AiPayload,
  input: AiSeoCopyInput,
): AiSeoCopyResult {
  const pet = isPetFoodContext(input.title, input.categoryTitles);
  const description = pet
    ? ensurePrimaryPhrasesInDescription(parsed.description, input.siteName)
    : parsed.description;
  const seoDescription = pet
    ? ensurePrimaryPhrasesInDescription(parsed.seoDescription, input.siteName).slice(0, 160)
    : parsed.seoDescription;
  return {
    used: true,
    provider,
    message: `${label} ile üretildi`,
    description,
    descriptionHtml: plainToDescriptionHtml(description),
    keyFeaturesHtml: plainToAccordionHtml(parsed.keyFeatures),
    howToUseHtml: plainToAccordionHtml(parsed.howToUse),
    seoTitle: parsed.seoTitle,
    seoDescription,
  };
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 2048 },
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
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: 2048,
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
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model,
      max_tokens: 2048,
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
  input: AiSeoCopyInput,
): Promise<AiSeoCopyResult | null> {
  if (name === "gemini" && config.geminiApiKey) {
    const raw = await callGemini(prompt, config.geminiApiKey, config.geminiModel);
    const parsed = raw ? parseAiJson(raw) : null;
    if (parsed) return toResult("gemini", "Google Gemini", parsed, input);
  }
  if (name === "openai" && config.openaiApiKey) {
    const raw = await callOpenAi(prompt, config.openaiApiKey, config.openaiModel);
    const parsed = raw ? parseAiJson(raw) : null;
    if (parsed) return toResult("openai", "OpenAI", parsed, input);
  }
  if (name === "claude" && config.claudeApiKey) {
    const raw = await callClaude(prompt, config.claudeApiKey, config.claudeModel);
    const parsed = raw ? parseAiJson(raw) : null;
    if (parsed) return toResult("claude", "Claude (Anthropic)", parsed, input);
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
      const result = await tryProvider(p, prompt, config, input);
      if (result) return withNutritionKeyFeatures(result, input);
    }
  }

  const tpl = templateCopy(input);
  const description = isPetFoodContext(input.title, input.categoryTitles)
    ? ensurePrimaryPhrasesInDescription(tpl.description, input.siteName)
    : tpl.description;
  return withNutritionKeyFeatures(
    {
      used: false,
      provider: "template",
      message: avail.any
        ? "AI yanıt alınamadı — profesyonel SEO şablonu kullanıldı (3 hedef kelime dahil)"
        : "AI kapalı — profesyonel SEO şablonu kullanıldı. Ayarlar → SEO AI ile AI metin açabilirsiniz.",
      description,
      descriptionHtml: plainToDescriptionHtml(description),
      keyFeaturesHtml: plainToAccordionHtml(tpl.keyFeatures),
      howToUseHtml: plainToAccordionHtml(tpl.howToUse),
      seoTitle: tpl.seoTitle,
      seoDescription: tpl.seoDescription,
    },
    input,
  );
}

function htmlToPlainFeatures(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function withNutritionKeyFeatures(result: AiSeoCopyResult, input: AiSeoCopyInput): AiSeoCopyResult {
  if (!isPetFoodContext(input.title, input.categoryTitles) || input.nutrition?.source === "none") {
    return result;
  }
  const plain = htmlToPlainFeatures(result.keyFeaturesHtml ?? "");
  const hasNumbers = /ham\s*protein[^%\n]*[\d]+(?:[.,]\d+)?\s*%/i.test(plain);
  if (hasNumbers && !plain.includes("…")) return result;

  const keyFeatures = buildPetNutritionKeyFeaturesBlock({
    title: input.title,
    brandTitle: input.brandTitle,
    siteName: input.siteName,
    nutrition: input.nutrition ?? null,
  });
  return { ...result, keyFeaturesHtml: plainToAccordionHtml(keyFeatures) };
}
