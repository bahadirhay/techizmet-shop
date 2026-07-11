import "server-only";

import { persistStoreMedia } from "@/lib/admin/store-media-persist";
import { saveImageBuffer } from "@/lib/admin/upload";
import { imageProviderOrder, type ResolvedSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";

function imagePrompt(title: string, excerpt: string, siteName: string): string {
  return [
    `Editorial hero photo for a pet shop blog article titled "${title}".`,
    excerpt ? `Topic: ${excerpt.slice(0, 200)}.` : "",
    `Brand context: ${siteName}, natural treats and pet care.`,
    "Warm natural light, shallow depth of field, no text, no logos, no watermark, photorealistic.",
  ]
    .filter(Boolean)
    .join(" ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadImageUrl(url: string): Promise<Buffer | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > 100 ? buf : null;
}

function falAuthHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Key ${apiKey}`,
  };
}

function extractFalImageUrl(data: { images?: { url?: string }[] }): string | null {
  return data.images?.[0]?.url?.trim() || null;
}

async function generateWithFalSync(
  prompt: string,
  apiKey: string,
  model: string,
): Promise<Buffer | null> {
  const modelPath = model.replace(/^\/+/, "");
  const res = await fetch(`https://fal.run/${modelPath}`, {
    method: "POST",
    headers: falAuthHeaders(apiKey),
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      prompt: prompt.slice(0, 4000),
      image_size: "landscape_16_9",
      num_images: 1,
      output_format: "jpeg",
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { images?: { url?: string }[] };
  const imageUrl = extractFalImageUrl(data);
  return imageUrl ? downloadImageUrl(imageUrl) : null;
}

async function generateWithFalQueue(
  prompt: string,
  apiKey: string,
  model: string,
): Promise<Buffer | null> {
  const modelPath = model.replace(/^\/+/, "");
  const submit = await fetch(`https://queue.fal.run/${modelPath}`, {
    method: "POST",
    headers: falAuthHeaders(apiKey),
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      prompt: prompt.slice(0, 4000),
      image_size: "landscape_16_9",
      num_images: 1,
      output_format: "jpeg",
    }),
  });
  if (!submit.ok) return null;
  const submitted = (await submit.json()) as { request_id?: string };
  const requestId = submitted.request_id?.trim();
  if (!requestId) return null;

  for (let i = 0; i < 45; i++) {
    await sleep(2000);
    const statusRes = await fetch(
      `https://queue.fal.run/${modelPath}/requests/${requestId}/status`,
      { headers: falAuthHeaders(apiKey), signal: AbortSignal.timeout(15_000) },
    );
    if (!statusRes.ok) continue;
    const status = (await statusRes.json()) as { status?: string };
    if (status.status === "FAILED") return null;
    if (status.status !== "COMPLETED") continue;

    const resultRes = await fetch(`https://queue.fal.run/${modelPath}/requests/${requestId}`, {
      headers: falAuthHeaders(apiKey),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resultRes.ok) return null;
    const data = (await resultRes.json()) as { images?: { url?: string }[] };
    const imageUrl = extractFalImageUrl(data);
    return imageUrl ? downloadImageUrl(imageUrl) : null;
  }
  return null;
}

export async function generateWithFal(
  prompt: string,
  apiKey: string,
  model: string,
): Promise<Buffer | null> {
  const sync = await generateWithFalSync(prompt, apiKey, model);
  if (sync) return sync;
  return generateWithFalQueue(prompt, apiKey, model);
}

async function generateWithOpenAi(prompt: string, apiKey: string): Promise<Buffer | null> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt.slice(0, 3800),
      size: "1792x1024",
      quality: "standard",
      response_format: "b64_json",
      n: 1,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) return null;
  return Buffer.from(b64, "base64");
}

export async function generateBlogCoverImage(params: {
  siteId: string;
  title: string;
  excerpt: string;
  siteName: string;
  aiConfig: ResolvedSeoAiConfig;
}): Promise<{ url: string | null; message: string }> {
  const providers = imageProviderOrder(params.aiConfig);
  if (!providers.length) {
    return {
      url: null,
      message:
        "Kapak görseli için fal.ai veya OpenAI anahtarı gerekli (Admin → SEO AI → Görsel üretimi)",
    };
  }

  const prompt = imagePrompt(params.title, params.excerpt, params.siteName);
  const errors: string[] = [];

  for (const name of providers) {
    let buf: Buffer | null = null;
    let label = "";

    if (name === "fal" && params.aiConfig.falApiKey) {
      label = `fal.ai (${params.aiConfig.falImageModel})`;
      buf = await generateWithFal(prompt, params.aiConfig.falApiKey, params.aiConfig.falImageModel);
    } else if (name === "openai" && params.aiConfig.openaiApiKey) {
      label = "OpenAI DALL·E";
      buf = await generateWithOpenAi(prompt, params.aiConfig.openaiApiKey);
    }

    if (buf && buf.length > 100) {
      const mime = name === "openai" ? "image/png" : "image/jpeg";
      const saved = await saveImageBuffer(params.siteId, buf, mime);
      const row = await persistStoreMedia(params.siteId, saved);
      return { url: row.url, message: `${label} ile kapak görseli üretildi` };
    }
    errors.push(label || name);
  }

  return {
    url: null,
    message: `AI görsel üretilemedi (${errors.join(", ")})`,
  };
}

export function injectBlogHeroImage(bodyHtml: string, imageUrl: string, alt: string): string {
  const safeAlt = alt.replace(/"/g, "&quot;");
  const figure = `<figure class="kn-blog-hero"><img src="${imageUrl}" alt="${safeAlt}" loading="lazy" width="1200" height="675" /></figure>`;
  if (!bodyHtml?.trim()) return figure;
  const h2 = bodyHtml.indexOf("<h2");
  if (h2 > 0) return `${bodyHtml.slice(0, h2)}${figure}${bodyHtml.slice(h2)}`;
  const firstP = bodyHtml.indexOf("</p>");
  if (firstP > 0) return `${bodyHtml.slice(0, firstP + 4)}${figure}${bodyHtml.slice(firstP + 4)}`;
  return figure + bodyHtml;
}
