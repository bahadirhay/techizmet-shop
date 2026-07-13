import "server-only";

import type { SocialCreativeBrief } from "@/lib/admin/social-content/creative-brief";
import { parseSocialCreativeBrief } from "@/lib/admin/social-content/creative-brief";
import { fetchInstagramMediaInsights } from "@/lib/social-publish/meta";
import { resolveSocialPublishConfig } from "@/lib/social-publish/settings";
import { getSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

export type SocialPerformanceHints = {
  available: boolean;
  topHooks: string[];
  strongAngles: string[];
  preferredMoods: string[];
  avgReach: number | null;
  sampleSize: number;
  insightNote: string;
};

export type SocialPostPerformance = {
  mediaId: string;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
  score: number;
  syncedAt: string;
};

function parsePerformanceJson(raw: string | null | undefined): SocialPostPerformance | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const score = typeof o.score === "number" ? o.score : 0;
    return {
      mediaId: String(o.mediaId ?? ""),
      reach: typeof o.reach === "number" ? o.reach : null,
      likes: typeof o.likes === "number" ? o.likes : null,
      comments: typeof o.comments === "number" ? o.comments : null,
      saved: typeof o.saved === "number" ? o.saved : null,
      score,
      syncedAt: String(o.syncedAt ?? new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

function engagementScore(insight: {
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
}): number {
  const reach = insight.reach ?? 0;
  const likes = insight.likes ?? 0;
  const comments = insight.comments ?? 0;
  const saved = insight.saved ?? 0;
  return reach + likes * 2 + comments * 3 + saved * 4;
}

function uniqueTop(values: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLocaleLowerCase("tr").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
    if (out.length >= max) break;
  }
  return out;
}

const EMPTY_HINTS: SocialPerformanceHints = {
  available: false,
  topHooks: [],
  strongAngles: [],
  preferredMoods: [],
  avgReach: null,
  sampleSize: 0,
  insightNote: "",
};

export async function syncDraftInstagramPerformance(
  siteId: string,
  draftId: string,
): Promise<SocialPostPerformance | null> {
  const row = await prisma.socialContentDraft.findFirst({
    where: { id: draftId, siteId, platform: "instagram", status: "published" },
    select: { id: true, externalId: true },
  });
  if (!row?.externalId) return null;

  const settings = await getSiteSettings(siteId);
  const config = resolveSocialPublishConfig(settings);
  if (!config.meta.enabled || !config.meta.accessToken) return null;

  const insight = await fetchInstagramMediaInsights(row.externalId, config.meta);
  if (!insight) return null;

  const perf: SocialPostPerformance = {
    mediaId: insight.mediaId,
    reach: insight.reach,
    likes: insight.likes,
    comments: insight.comments,
    saved: insight.saved,
    score: engagementScore(insight),
    syncedAt: new Date().toISOString(),
  };

  await prisma.socialContentDraft.update({
    where: { id: row.id },
    data: { performanceJson: JSON.stringify(perf) },
  });

  return perf;
}

export async function loadSocialPerformanceHints(siteId: string): Promise<SocialPerformanceHints> {
  const published = await prisma.socialContentDraft.findMany({
    where: {
      siteId,
      platform: "instagram",
      status: "published",
      OR: [{ externalId: { not: null } }, { performanceJson: { not: null } }],
    },
    orderBy: { publishedAt: "desc" },
    take: 20,
    select: {
      id: true,
      externalId: true,
      hook: true,
      caption: true,
      creativeBriefJson: true,
      performanceJson: true,
    },
  });

  if (!published.length) {
    return {
      ...EMPTY_HINTS,
      insightNote: "Henüz yayınlanmış Instagram gönderisi yok — şablon brif kullanılacak",
    };
  }

  const settings = await getSiteSettings(siteId);
  const config = resolveSocialPublishConfig(settings);
  const canFetch = config.meta.enabled && Boolean(config.meta.accessToken);

  type Ranked = {
    score: number;
    hook: string;
    angle: string;
    mood: string;
    reach: number | null;
  };
  const ranked: Ranked[] = [];

  for (const row of published) {
    let perf = parsePerformanceJson(row.performanceJson);
    if (!perf && row.externalId && canFetch) {
      const insight = await fetchInstagramMediaInsights(row.externalId, config.meta);
      if (insight) {
        perf = {
          mediaId: insight.mediaId,
          reach: insight.reach,
          likes: insight.likes,
          comments: insight.comments,
          saved: insight.saved,
          score: engagementScore(insight),
          syncedAt: new Date().toISOString(),
        };
        await prisma.socialContentDraft.update({
          where: { id: row.id },
          data: { performanceJson: JSON.stringify(perf) },
        });
      }
    }

    const brief = parseSocialCreativeBrief(row.creativeBriefJson);
    const hook = row.hook?.trim() || row.caption?.split(/[.!?]/)[0]?.trim() || "";
    ranked.push({
      score: perf?.score ?? 0,
      hook,
      angle: brief?.productAngle ?? "",
      mood: brief?.mood ?? "",
      reach: perf?.reach ?? null,
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.filter((r) => r.score > 0).slice(0, 8);
  const sample = top.length ? top : ranked.slice(0, 5);

  const reaches = sample.map((r) => r.reach).filter((r): r is number => typeof r === "number" && r > 0);
  const avgReach = reaches.length
    ? Math.round(reaches.reduce((a, b) => a + b, 0) / reaches.length)
    : null;

  const hints: SocialPerformanceHints = {
    available: sample.length > 0,
    topHooks: uniqueTop(
      sample.map((r) => r.hook).filter(Boolean),
      4,
    ),
    strongAngles: uniqueTop(
      sample.map((r) => r.angle).filter(Boolean),
      3,
    ),
    preferredMoods: uniqueTop(
      sample.map((r) => r.mood).filter(Boolean),
      2,
    ),
    avgReach,
    sampleSize: sample.length,
    insightNote:
      top.length > 0
        ? `${top.length} güçlü gönderiden öğrenilen ipuçları uygulanıyor`
        : "Yayın metrikleri henüz yok — varsayılan brif kullanılacak",
  };

  return hints;
}

export function applyPerformanceHintsToBrief(
  brief: SocialCreativeBrief,
  hints: SocialPerformanceHints,
): SocialCreativeBrief {
  if (!hints.available) return brief;

  const hooks = uniqueTop([...hints.topHooks, ...brief.hooks], 4);
  const productAngle = hints.strongAngles[0] ?? brief.productAngle;
  const mood = hints.preferredMoods[0] ?? brief.mood;

  return {
    ...brief,
    productAngle,
    mood,
    hooks: hooks.length ? hooks : brief.hooks,
  };
}

export type SocialPerformanceSummary = {
  hints: SocialPerformanceHints;
  topPosts: Array<{
    draftId: string;
    productTitle: string;
    reach: number | null;
    likes: number | null;
    saved: number | null;
    score: number;
    publishedAt: string | null;
  }>;
};

export async function loadSocialPerformanceSummary(siteId: string): Promise<SocialPerformanceSummary> {
  const hints = await loadSocialPerformanceHints(siteId);

  const rows = await prisma.socialContentDraft.findMany({
    where: { siteId, platform: "instagram", status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: {
      id: true,
      performanceJson: true,
      publishedAt: true,
      product: { select: { title: true } },
    },
  });

  const topPosts = rows
    .map((r) => {
      const perf = parsePerformanceJson(r.performanceJson);
      return {
        draftId: r.id,
        productTitle: r.product.title,
        reach: perf?.reach ?? null,
        likes: perf?.likes ?? null,
        saved: perf?.saved ?? null,
        score: perf?.score ?? 0,
        publishedAt: r.publishedAt?.toISOString() ?? null,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return { hints, topPosts };
}
