import "server-only";

import type { ResolvedSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import { providerOrder, seoAiAvailable } from "@/lib/admin/product-seo/ai-settings";
import type { BlogTopicProduct } from "@/lib/admin/blog-automation/topics";

export type AiBlogCopyInput = {
  keyword: string;
  siteName: string;
  author?: string;
  relatedProducts: BlogTopicProduct[];
};

export type AiBlogCopyResult = {
  used: boolean;
  provider?: "gemini" | "openai" | "claude" | "template";
  message: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  seoTitle: string;
  seoDescription: string;
};

type AiBlogPayload = {
  title: string;
  excerpt: string;
  bodyHtml: string;
  seoTitle: string;
  seoDescription: string;
};

function parseAiJson(text: string): AiBlogPayload | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const o = JSON.parse(jsonMatch[0]) as Partial<AiBlogPayload>;
    const title = String(o.title ?? "").trim();
    const bodyHtml = String(o.bodyHtml ?? "").trim();
    if (!title || !bodyHtml) return null;
    return {
      title: title.slice(0, 120),
      excerpt: String(o.excerpt ?? "").trim().slice(0, 280),
      bodyHtml,
      seoTitle: String(o.seoTitle ?? title).trim().slice(0, 65),
      seoDescription: String(o.seoDescription ?? o.excerpt ?? "").trim().slice(0, 165),
    };
  } catch {
    return null;
  }
}

function buildPrompt(input: AiBlogCopyInput): string {
  const products = input.relatedProducts
    .map((p) => `- ${p.title} (/products/${p.slug})`)
    .join("\n");

  return `Sen Türkiye e-ticaret blog editörüsün. Evcil hayvan / pet shop bağlamında bilgilendirici, SEO uyumlu Türkçe blog yazısı üret. Yalnızca JSON döndür.

Anahtar konu: ${input.keyword}
Site: ${input.siteName}
Yazar: ${input.author || "—"}
İlgili ürünler:
${products || "—"}

JSON şeması:
{
  "title": "40-90 karakter çekici başlık",
  "excerpt": "120-240 karakter özet",
  "bodyHtml": "<p>...</p><h2>...</h2><ul><li>...</li></ul> — en az 4 paragraf, 2 alt başlık, kısa SSS",
  "seoTitle": "25-65 karakter meta başlık",
  "seoDescription": "70-165 karakter meta açıklama"
}

Kurallar:
- Abartılı sağlık iddiası yok; veteriner tavsiyesi gerektiğinde belirt
- Anahtar kelimeyi doğal kullan
- Ürün linklerini metinde /products/slug formatında ver
- HTML sade: p, h2, h3, ul, ol, li, strong, a`;
}

function templateCopy(input: AiBlogCopyInput): AiBlogPayload {
  const title = `${input.keyword.charAt(0).toUpperCase()}${input.keyword.slice(1)} hakkında bilmeniz gerekenler`;
  const productBlock = input.relatedProducts.length
    ? `<h2>Öne çıkan ürünler</h2><ul>${input.relatedProducts
        .map(
          (p) =>
            `<li><a href="/products/${p.slug}"><strong>${p.title}</strong></a> — ${input.siteName} mağazasında inceleyebilirsiniz.</li>`,
        )
        .join("")}</ul>`
    : "";

  const bodyHtml = [
    `<p><strong>${input.keyword}</strong> araması mağazamızda sık görülüyor. Bu rehberde doğru ürün seçimi, kullanım ve dikkat edilmesi gerekenleri özetliyoruz.</p>`,
    `<h2>${input.keyword} nedir?</h2>`,
    `<p>Evcil hayvan sahipleri için ${input.keyword} konusunda bilinçli seçim yapmak hem bütçe hem de sağlık açısından önemlidir. Ürün etiketlerini, içerik listesini ve kullanım önerilerini karşılaştırarak ilerleyin.</p>`,
    `<h2>Nasıl seçilir?</h2>`,
    `<ul><li>Yaş, ırk ve aktivite seviyesine uygunluk</li><li>İçerik ve alerjen bilgisi</li><li>Günlük porsiyon / doz</li><li>Saklama koşulları</li></ul>`,
    productBlock,
    `<h2>Sık sorulan sorular</h2>`,
    `<p><strong>Ne sıklıkla kullanılmalı?</strong> Ürün etiketindeki öneriye ve veteriner tavsiyesine göre ayarlayın.</p>`,
    `<p><strong>Kimler için uygun değildir?</strong> Hassas dönemlerde (yavru, gebelik, kronik hastalık) mutlaka uzmana danışın.</p>`,
    `<p>Daha fazla bilgi için <a href="/collections/all">${input.siteName}</a> kataloğuna göz atın.</p>`,
  ]
    .filter(Boolean)
    .join("");

  return {
    title,
    excerpt: `${input.keyword} hakkında pratik rehber: seçim kriterleri, kullanım ipuçları ve mağazamızdaki ilgili ürünler.`,
    bodyHtml,
    seoTitle: `${input.keyword} rehberi | ${input.siteName}`.slice(0, 65),
    seoDescription: `${input.keyword} için seçim, kullanım ve dikkat edilecekler. ${input.siteName} blog.`,
  };
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
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
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 4096,
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
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const block = data.content?.find((c) => c.type === "text");
  return block?.text ?? null;
}

async function tryProvider(
  name: "gemini" | "openai" | "claude",
  prompt: string,
  config: ResolvedSeoAiConfig,
): Promise<AiBlogCopyResult | null> {
  let raw: string | null = null;
  if (name === "gemini" && config.geminiApiKey) {
    raw = await callGemini(prompt, config.geminiApiKey, config.geminiModel);
  } else if (name === "openai" && config.openaiApiKey) {
    raw = await callOpenAi(prompt, config.openaiApiKey, config.openaiModel);
  } else if (name === "claude" && config.claudeApiKey) {
    raw = await callClaude(prompt, config.claudeApiKey, config.claudeModel);
  }
  const parsed = raw ? parseAiJson(raw) : null;
  if (!parsed) return null;
  const label = name === "gemini" ? "Google Gemini" : name === "openai" ? "OpenAI" : "Claude";
  return {
    used: true,
    provider: name,
    message: `${label} ile üretildi`,
    ...parsed,
  };
}

export async function generateAiBlogCopy(
  input: AiBlogCopyInput,
  config: ResolvedSeoAiConfig,
): Promise<AiBlogCopyResult> {
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
      ? "AI yanıt alınamadı — şablon kullanıldı"
      : "AI kapalı — şablon kullanıldı. Ayarlar → SEO AI ile açabilirsiniz.",
    ...tpl,
  };
}
