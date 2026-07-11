import "server-only";

import { prisma } from "@/lib/prisma";
import { getSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import { collectStoreSnapshot, type StoreSnapshot } from "@/lib/admin/store-insights/collect";

export type InsightChannel = "trendyol" | "amazon" | "instagram" | "general";
export type InsightCategory = "pricing" | "listing" | "stock" | "content" | "qna";
export type InsightSeverity = "low" | "medium" | "high";

const CHANNELS: InsightChannel[] = ["trendyol", "amazon", "instagram", "general"];
const CATEGORIES: InsightCategory[] = ["pricing", "listing", "stock", "content", "qna"];
const SEVERITIES: InsightSeverity[] = ["low", "medium", "high"];

type RawInsight = {
  title: string;
  channel: InsightChannel;
  category: InsightCategory;
  severity: InsightSeverity;
  detail: string;
  actionType: "none" | "instagram_post";
  productId?: string;
};

// ai-blog.ts'teki Claude çağrı deseninin küçük bir kopyası — o dosyadaki yardımcılar
// export edilmediği için burada tekrarlanıyor (aynı model alias/fallback mantığı).
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

async function callClaude(
  prompt: string,
  apiKey: string,
  model: string,
): Promise<{ text: string | null; error: string | null }> {
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
      max_tokens: 4096,
      system:
        "Türkçe konuşan, veriye dayalı e-ticaret büyüme danışmanısın. Sadece geçerli JSON döndür, markdown code fence kullanma.",
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

function money(minor: number): string {
  return (minor / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function buildPrompt(s: StoreSnapshot): string {
  const topProducts =
    s.sales.topProducts
      .slice(0, 5)
      .map((p) => `- ${p.title}: ${p.qty} adet, ${money(p.revenueMinor)} TL`)
      .join("\n") || "—";

  const sources =
    s.sales.orderSources
      .map((o) => `- ${o.label}: ${o.count} sipariş, ${money(o.revenueMinor)} TL`)
      .join("\n") || "—";

  const issues =
    s.listingIssues
      .slice(0, 20)
      .map(
        (i) =>
          `- [${i.platform}] ${i.productTitle}: durum=${i.listingStatus}${
            i.lastError ? `, hata="${i.lastError.slice(0, 120)}"` : ""
          }`,
      )
      .join("\n") || "Sorunlu ilan yok";

  const gaps =
    s.instagramContentGaps
      .slice(0, 15)
      .map(
        (g) =>
          `- ${g.productTitle} (${
            g.reason === "no_draft" ? "hiç içerik üretilmemiş" : "üretildi ama hiç paylaşılmamış"
          }) [productId=${g.productId}]`,
      )
      .join("\n") || "Tüm aktif ürünler için Instagram içeriği var";

  const recentPosts = s.instagramInsightsAvailable
    ? s.recentInstagramPosts
        .map((p) => {
          const i = p.insight;
          const metrics = i
            ? `erişim=${i.reach ?? "?"}, beğeni=${i.likes ?? "?"}, yorum=${i.comments ?? "?"}, kaydedilme=${i.saved ?? "?"}`
            : "metrik alınamadı";
          return `- ${p.productTitle} (${p.publishedAt.slice(0, 10)}): ${metrics}`;
        })
        .join("\n") || "Son 30 günde yayınlanmış Instagram gönderisi yok"
    : "Instagram Insights izni henüz kurulmamış — sadece içerik boşluğu sinyaline dayan";

  return `Sen Türkiye'de faaliyet gösteren "Anatolian Paw" doğal köpek ödülü markasının e-ticaret büyüme danışmanısın. Aşağıdaki son 30 günlük performans verisine bakarak mağazanın Trendyol, Amazon ve Instagram kanallarında daha başarılı olması için ÖNCELİKLENDİRİLMİŞ, SOMUT öneriler üret.

SON 30 GÜN ÖZET:
Toplam sipariş: ${s.sales.totals.orders}, Gelir: ${money(s.sales.totals.revenueMinor)} TL, Ort. sepet: ${money(s.sales.totals.avgOrderMinor)} TL

KANAL BAZLI SİPARİŞLER:
${sources}

EN ÇOK SATAN ÜRÜNLER:
${topProducts}

PAZARYERİ İLAN SORUNLARI (reddedilen/askıya alınan/eksik/pasif):
${issues}

BEKLEYEN TRENDYOL MÜŞTERİ SORUSU: ${s.pendingTrendyolQuestions} (varsa panelden yanıtlanmalı)

INSTAGRAM İÇERİK BOŞLUKLARI (${s.activeProductCount} aktif üründen):
${gaps}

SON 30 GÜNDE YAYINLANAN INSTAGRAM GÖNDERİLERİ VE PERFORMANSI:
${recentPosts}

GÖREV:
En fazla 8 öneri üret, en önemliden başla. Her öneri için şu alanları doldur:
- title: kısa başlık (max 100 karakter, Türkçe)
- channel: "trendyol" | "amazon" | "instagram" | "general"
- category: "pricing" | "listing" | "stock" | "content" | "qna"
- severity: "low" | "medium" | "high"
- detail: 2-3 cümlelik somut açıklama — NEDEN önemli ve NE yapılmalı
- actionType: SADECE Instagram içerik boşluğu önerisi için "instagram_post" yaz ve productId ekle (yukarıdaki listeden [productId=...] değerini birebir kopyala); diğer TÜM önerilerde "none" yaz (fiyat/liste/stok/soru-cevap önerileri otomatik uygulanmaz, bilgilendirme amaçlıdır)

Sadece geçerli bir JSON dizisi döndür, başka hiçbir metin ekleme. Örnek format:
[{"title":"...","channel":"trendyol","category":"listing","severity":"high","detail":"...","actionType":"none"}]`;
}

function parseInsights(text: string): RawInsight[] {
  const match = text.trim().match(/\[[\s\S]*\]/);
  if (!match) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  const out: RawInsight[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = String(o.title ?? "").trim();
    const detail = String(o.detail ?? "").trim();
    if (!title || !detail) continue;
    const channel = CHANNELS.includes(o.channel as InsightChannel)
      ? (o.channel as InsightChannel)
      : "general";
    const category = CATEGORIES.includes(o.category as InsightCategory)
      ? (o.category as InsightCategory)
      : "content";
    const severity = SEVERITIES.includes(o.severity as InsightSeverity)
      ? (o.severity as InsightSeverity)
      : "medium";
    const actionType = o.actionType === "instagram_post" ? "instagram_post" : "none";
    const productId = typeof o.productId === "string" ? o.productId.trim() : undefined;
    out.push({
      title: title.slice(0, 200),
      channel,
      category,
      severity,
      detail: detail.slice(0, 2000),
      actionType: actionType === "instagram_post" && productId ? "instagram_post" : "none",
      productId: actionType === "instagram_post" ? productId : undefined,
    });
  }
  return out;
}

export type GenerateStoreInsightsResult = {
  ok: boolean;
  created: number;
  skippedDuplicates: number;
  message: string;
};

/** Snapshot toplar, Claude'a analiz ettirir, sonuçları `pending` olarak kaydeder. */
export async function generateStoreInsights(siteId: string): Promise<GenerateStoreInsightsResult> {
  const snapshot = await collectStoreSnapshot(siteId);
  const config = await getSeoAiConfig(siteId);

  if (!config.claudeApiKey) {
    return {
      ok: false,
      created: 0,
      skippedDuplicates: 0,
      message: "Claude API anahtarı yapılandırılmamış (Admin → Ayarlar → SEO AI)",
    };
  }

  const models = claudeModelCandidates(config.claudeModel);
  let text: string | null = null;
  let lastError = "";
  for (const model of models) {
    const r = await callClaude(buildPrompt(snapshot), config.claudeApiKey, model);
    if (r.text) {
      text = r.text;
      break;
    }
    if (r.error) lastError = r.error;
  }

  if (!text) {
    return { ok: false, created: 0, skippedDuplicates: 0, message: `AI yanıt vermedi: ${lastError}` };
  }

  const insights = parseInsights(text);
  if (!insights.length) {
    return { ok: false, created: 0, skippedDuplicates: 0, message: "AI'den geçerli öneri alınamadı" };
  }

  const existingPending = await prisma.storePerformanceInsight.findMany({
    where: { siteId, status: "pending" },
    select: { title: true, channel: true },
  });
  const existingKeys = new Set(existingPending.map((e) => `${e.channel}::${e.title}`));
  const snapshotJson = JSON.stringify(snapshot).slice(0, 20_000);

  let created = 0;
  let skippedDuplicates = 0;

  for (const ins of insights) {
    const key = `${ins.channel}::${ins.title}`;
    if (existingKeys.has(key)) {
      skippedDuplicates++;
      continue;
    }
    await prisma.storePerformanceInsight.create({
      data: {
        siteId,
        channel: ins.channel,
        category: ins.category,
        severity: ins.severity,
        title: ins.title,
        detail: ins.detail,
        actionType: ins.actionType,
        payloadJson: ins.actionType === "instagram_post" ? JSON.stringify({ productId: ins.productId }) : null,
        sourceSnapshotJson: snapshotJson,
        status: "pending",
      },
    });
    existingKeys.add(key);
    created++;
  }

  return {
    ok: true,
    created,
    skippedDuplicates,
    message: `${created} yeni öneri üretildi${skippedDuplicates ? `, ${skippedDuplicates} zaten bekliyordu` : ""}`,
  };
}
