import "server-only";

import { prisma } from "@/lib/prisma";
import { generateSocialContentForProduct } from "@/lib/admin/social-content/generate";
import { publishSocialContentDraft } from "@/lib/social-publish/publish-draft";
import { getDefaultSite } from "@/lib/site";
import { getSiteSeo, getSiteSettings } from "@/lib/site-settings";

export type ExecuteInsightActionResult = {
  ok: boolean;
  message: string;
};

/**
 * Onaylanan bir "instagram_post" önerisini uygular: ürün için (mevcut ürün
 * görselleriyle) Instagram taslağı üretir/günceller ve doğrudan yayınlar.
 * Sadece admin onayından sonra çağrılır — hiçbir zaman otomatik tetiklenmez.
 */
export async function executeInsightAction(
  siteId: string,
  insightId: string,
): Promise<ExecuteInsightActionResult> {
  const insight = await prisma.storePerformanceInsight.findFirst({
    where: { id: insightId, siteId },
  });
  if (!insight) return { ok: false, message: "Öneri bulunamadı" };
  if (insight.status !== "approved") {
    return { ok: false, message: "Öneri onaylanmadan uygulanamaz" };
  }
  if (insight.actionType !== "instagram_post") {
    return { ok: false, message: "Bu öneri türü için otomatik uygulama yok" };
  }

  let productId = "";
  try {
    const payload = insight.payloadJson ? (JSON.parse(insight.payloadJson) as { productId?: string }) : {};
    productId = payload.productId?.trim() ?? "";
  } catch {
    /* payload bozuksa aşağıda hata dönülür */
  }
  if (!productId) return { ok: false, message: "Öneride ürün bilgisi eksik" };

  const site = await getDefaultSite();
  const settings = await getSiteSettings(siteId);
  const siteName = getSiteSeo(settings, site.name).siteTitle;

  const genResult = await generateSocialContentForProduct({ siteId, siteName, productId });
  if (!genResult.ok || !genResult.drafts) {
    return { ok: false, message: genResult.error ?? "İçerik üretilemedi" };
  }

  const igDraft = genResult.drafts.find((d) => d.platform === "instagram");
  if (!igDraft) return { ok: false, message: "Instagram taslağı oluşturulamadı" };

  const pubResult = await publishSocialContentDraft(siteId, igDraft.id);
  if (!pubResult.ok) {
    return { ok: false, message: pubResult.error ?? "Instagram yayını başarısız" };
  }

  return {
    ok: true,
    message: pubResult.publishedUrl
      ? `Instagram'da yayınlandı: ${pubResult.publishedUrl}`
      : "Instagram'da yayınlandı",
  };
}
