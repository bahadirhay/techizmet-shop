import "server-only";

import { getSeoAiConfig, providerOrder, seoAiAvailable } from "@/lib/admin/product-seo/ai-settings";
import { prisma } from "@/lib/prisma";

export type ProductImageAltRow = {
  id: string;
  alt: string;
};

function templateAlts(productTitle: string, brandTitle: string | null, count: number): string[] {
  const base = brandTitle?.trim() ? `${brandTitle.trim()} ${productTitle.trim()}` : productTitle.trim();
  const suffixes = [
    "ana ürün görseli",
    "ambalaj ve ürün detayı",
    "içerik ve kullanım",
    "ürün yakın plan",
    "mağaza vitrin görseli",
  ];
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? base : `${base} — ${suffixes[i] ?? `görsel ${i + 1}`}`,
  );
}

function parseAltJson(text: string, count: number): string[] | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const arr = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(arr)) return null;
    const alts = arr.map((v) => String(v).trim().slice(0, 125)).filter(Boolean);
    if (!alts.length) return null;
    while (alts.length < count) {
      alts.push(alts[alts.length - 1]!);
    }
    return alts.slice(0, count);
  } catch {
    return null;
  }
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
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return data.content?.find((c) => c.type === "text")?.text ?? null;
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

function buildImageAltPrompt(input: {
  title: string;
  brandTitle: string | null;
  categoryTitles: string[];
  imageCount: number;
}): string {
  return `Sen Türkiye e-ticaret SEO uzmanısın. Ürün görselleri için Google Görsel Arama uyumlu alt metinleri yaz.
Yalnızca JSON dizi döndür — ${input.imageCount} öğe, sırayla her görsel için bir alt metin.

Ürün: ${input.title}
Marka: ${input.brandTitle ?? "—"}
Kategori: ${input.categoryTitles.join(" > ") || "—"}

Kurallar:
- Türkçe, 40-120 karakter
- İlk görsel: ürün adı + marka (varsa)
- Diğerleri: farklı açı (ambalaj, detay, içerik, kullanım)
- Anahtar kelime doldurma yok; doğal cümle
- Ürün adını değiştirme

Örnek format: ["Marka Ürün Adı", "Marka Ürün Adı — ambalaj görseli"]`;
}

export async function generateProductImageAlts(
  siteId: string,
  productId: string,
): Promise<{ alts: ProductImageAltRow[]; provider: string }> {
  const product = await prisma.storeProduct.findFirst({
    where: { id: productId, siteId },
    select: {
      title: true,
      brand: { select: { name: true } },
      category: { select: { title: true } },
      categoryLinks: {
        orderBy: { sortOrder: "asc" },
        select: { category: { select: { title: true } } },
      },
      images: {
        where: { mediaType: "image" },
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!product) throw new Error("Ürün bulunamadı");
  if (!product.images.length) return { alts: [], provider: "none" };

  const categoryTitles = [
    ...product.categoryLinks.map((l) => l.category.title),
    product.category?.title,
  ].filter((t): t is string => Boolean(t?.trim()));

  const config = await getSeoAiConfig(siteId);
  const avail = seoAiAvailable(config);
  const prompt = buildImageAltPrompt({
    title: product.title,
    brandTitle: product.brand?.name ?? null,
    categoryTitles,
    imageCount: product.images.length,
  });

  let altTexts: string[] | null = null;
  let provider = "template";

  if (config.enabled && avail.any) {
    for (const p of providerOrder(config)) {
      if (p === "claude" && config.claudeApiKey) {
        const raw = await callClaude(prompt, config.claudeApiKey, config.claudeModel);
        altTexts = raw ? parseAltJson(raw, product.images.length) : null;
        if (altTexts) {
          provider = "claude";
          break;
        }
      }
      if (p === "gemini" && config.geminiApiKey) {
        const raw = await callGemini(prompt, config.geminiApiKey, config.geminiModel);
        altTexts = raw ? parseAltJson(raw, product.images.length) : null;
        if (altTexts) {
          provider = "gemini";
          break;
        }
      }
    }
  }

  if (!altTexts) {
    altTexts = templateAlts(product.title, product.brand?.name ?? null, product.images.length);
    provider = "template";
  }

  return {
    alts: product.images.map((img, i) => ({
      id: img.id,
      alt: altTexts![i] ?? altTexts![0]!,
    })),
    provider,
  };
}

export async function applyProductImageAlts(
  siteId: string,
  productId: string,
): Promise<{ updated: number; provider: string }> {
  const { alts, provider } = await generateProductImageAlts(siteId, productId);
  for (const row of alts) {
    await prisma.storeProductImage.updateMany({
      where: { id: row.id, product: { id: productId, siteId } },
      data: { alt: row.alt },
    });
  }
  return { updated: alts.length, provider };
}
