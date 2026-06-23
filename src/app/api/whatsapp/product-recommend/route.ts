import { NextResponse } from "next/server";
import { clientIp, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getDefaultSite } from "@/lib/site";
import { recommendProductsForPet } from "@/lib/whatsapp/product-recommend";
import { formatProductRecommendReply } from "@/lib/whatsapp/product-recommend-reply";
import { runAssistantPipeline } from "@/lib/assistant/run-pipeline";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getAssistantConfig, isAssistantChannelEnabled } from "@/lib/assistant/settings";

function petTypeLabel(type: string | undefined): string | undefined {
  if (type === "dog") return "Köpek";
  if (type === "cat") return "Kedi";
  return undefined;
}

export async function POST(req: Request) {
  const rl = await enforceRateLimit(`wa-product-recommend:${clientIp(req)}`, 30, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  const body = (await req.json().catch(() => ({}))) as {
    breed?: string;
    age?: string;
    petType?: "dog" | "cat" | null;
    note?: string;
  };

  const breed = String(body.breed ?? "").trim();
  const age = String(body.age ?? "").trim();
  const note = String(body.note ?? "").trim();
  const petType = body.petType === "cat" || body.petType === "dog" ? body.petType : null;

  if (!breed && !age) {
    return NextResponse.json(
      { error: "Köpeğinizin ırkını veya yaşını yazın." },
      { status: 400 },
    );
  }

  const site = await getDefaultSite();
  let hits = await recommendProductsForPet({
    siteId: site.id,
    breed,
    age,
    petType,
    note,
  });

  let summary = formatProductRecommendReply({
    breed,
    age,
    petTypeLabel: petTypeLabel(petType ?? undefined),
    hits,
  });

  if (!hits.length) {
    try {
      const settings = await getCachedParsedSiteSettings(site.id);
      const assistant = getAssistantConfig(settings, site.name);
      if (isAssistantChannelEnabled(assistant, "whatsapp")) {
        const query = [petTypeLabel(petType ?? undefined), breed, age, note, "ürün önerisi"]
          .filter(Boolean)
          .join(" ");
        const pipeline = await runAssistantPipeline({
          siteId: site.id,
          channel: "whatsapp",
          externalUserId: `wa-recommend:${clientIp(req)}`,
          message: query,
          persist: false,
        });
        if (pipeline.reply && pipeline.layer !== "disabled") {
          summary = pipeline.reply;
        }
      }
    } catch {
      /* asistan tablosu yoksa kural tabanlı yanıt yeterli */
    }
  }

  return NextResponse.json({
    products: hits,
    summary,
  });
}
