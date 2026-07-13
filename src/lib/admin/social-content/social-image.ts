import "server-only";

import { persistStoreMedia } from "@/lib/admin/store-media-persist";
import { saveImageBuffer } from "@/lib/admin/upload";
import { generateWithFal } from "@/lib/admin/blog-automation/blog-image";
import { imageProviderOrder, type ResolvedSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import type { SocialImageAspect } from "@/lib/admin/social-content/creative-brief";
import { applySocialBrandOverlay, type SocialComposeOptions } from "@/lib/admin/social-content/social-compose";

function falImageSize(aspect: SocialImageAspect): string {
  if (aspect === "portrait") return "portrait_16_9";
  if (aspect === "landscape") return "landscape_16_9";
  return "square_hd";
}

function openAiImageSize(aspect: SocialImageAspect): "1024x1024" | "1024x1792" | "1792x1024" {
  if (aspect === "portrait") return "1024x1792";
  if (aspect === "landscape") return "1792x1024";
  return "1024x1024";
}

async function generateWithOpenAiSized(
  prompt: string,
  apiKey: string,
  aspect: SocialImageAspect,
): Promise<Buffer | null> {
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
      size: openAiImageSize(aspect),
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

async function generateWithFalSized(
  prompt: string,
  apiKey: string,
  model: string,
  aspect: SocialImageAspect,
): Promise<Buffer | null> {
  const modelPath = model.replace(/^\/+/, "");
  const imageSize = falImageSize(aspect);
  const res = await fetch(`https://fal.run/${modelPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${apiKey}`,
    },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      prompt: prompt.slice(0, 4000),
      image_size: imageSize,
      num_images: 1,
      output_format: "jpeg",
    }),
  });
  if (!res.ok) {
    return generateWithFal(prompt, apiKey, model);
  }
  const data = (await res.json()) as { images?: { url?: string }[] };
  const imageUrl = data.images?.[0]?.url?.trim();
  if (!imageUrl) return null;
  const dl = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
  if (!dl.ok) return null;
  const buf = Buffer.from(await dl.arrayBuffer());
  return buf.length > 100 ? buf : null;
}

export async function generateSocialCreativeImage(params: {
  siteId: string;
  prompt: string;
  aspect: SocialImageAspect;
  aiConfig: ResolvedSeoAiConfig;
  compose?: Omit<SocialComposeOptions, "aspect"> | null;
}): Promise<{
  url: string | null;
  provider: string | null;
  message: string;
  branded: boolean;
}> {
  const providers = imageProviderOrder(params.aiConfig);
  if (!providers.length) {
    return {
      url: null,
      provider: null,
      message: "Görsel AI için fal.ai veya OpenAI anahtarı gerekli (Admin → SEO AI)",
      branded: false,
    };
  }

  const errors: string[] = [];
  for (const name of providers) {
    let buf: Buffer | null = null;
    let label = "";

    if (name === "fal" && params.aiConfig.falApiKey) {
      label = `fal (${params.aiConfig.falImageModel})`;
      buf = await generateWithFalSized(
        params.prompt,
        params.aiConfig.falApiKey,
        params.aiConfig.falImageModel,
        params.aspect,
      );
    } else if (name === "openai" && params.aiConfig.openaiApiKey) {
      label = "DALL·E 3";
      buf = await generateWithOpenAiSized(params.prompt, params.aiConfig.openaiApiKey, params.aspect);
    }

    if (buf && buf.length > 100) {
      let branded = false;
      if (params.compose) {
        try {
          buf = await applySocialBrandOverlay(buf, { ...params.compose, aspect: params.aspect });
          branded = true;
        } catch {
          /* ham AI görseli kullan */
        }
      }
      const mime = branded ? "image/webp" : name === "openai" ? "image/png" : "image/jpeg";
      const saved = await saveImageBuffer(params.siteId, buf, mime);
      const row = await persistStoreMedia(params.siteId, saved);
      const brandNote = branded ? " + marka katmanı" : "";
      return {
        url: row.url,
        provider: label,
        message: `${label} ile sosyal görsel üretildi${brandNote}`,
        branded,
      };
    }
    if (label) errors.push(label);
  }

  return {
    url: null,
    provider: null,
    message: `AI görsel üretilemedi (${errors.join(", ") || "anahtar yok"})`,
    branded: false,
  };
}
