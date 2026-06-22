import "server-only";

import type { SocialPlatform } from "@/lib/admin/social-content/types";
import { publishSocialContentDraft } from "@/lib/social-publish/publish-draft";
import { prisma } from "@/lib/prisma";

export type ScheduledPublishRun = {
  processed: number;
  published: number;
  failed: number;
  results: Array<{ draftId: string; platform: SocialPlatform; ok: boolean; error?: string }>;
};

/** Zamanı gelmiş taslakları yayınla */
export async function runScheduledSocialPublishes(siteId: string, limit = 20): Promise<ScheduledPublishRun> {
  const now = new Date();
  const due = await prisma.socialContentDraft.findMany({
    where: {
      siteId,
      status: "scheduled",
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
    select: { id: true, platform: true },
  });

  const results: ScheduledPublishRun["results"] = [];
  let published = 0;
  let failed = 0;

  for (const row of due) {
    const result = await publishSocialContentDraft(siteId, row.id);
    results.push({
      draftId: row.id,
      platform: row.platform as SocialPlatform,
      ok: result.ok,
      error: result.error,
    });
    if (result.ok) published += 1;
    else failed += 1;
  }

  return { processed: due.length, published, failed, results };
}
