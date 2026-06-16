import "server-only";

import { formatFoodFundKg } from "@/lib/street-food-fund/format";
import type { StreetFoodDonationPublic } from "@/lib/street-food-fund/types";
import { prisma } from "@/lib/prisma";

export async function listPublishedStreetFoodDonations(
  siteId: string,
  locale: "tr" | "en" = "tr",
  limit = 12,
): Promise<StreetFoodDonationPublic[]> {
  const rows = await prisma.streetFoodDonation.findMany({
    where: { siteId, published: true },
    orderBy: [{ donatedAt: "desc" }, { publishedAt: "desc" }],
    take: limit,
  });

  return rows.map((row) => {
    let photoUrls: string[] = [];
    if (row.photoUrlsJson?.trim()) {
      try {
        const parsed = JSON.parse(row.photoUrlsJson) as unknown;
        if (Array.isArray(parsed)) {
          photoUrls = parsed.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
        }
      } catch {
        photoUrls = [];
      }
    }
    return {
      id: row.id,
      recipientName: row.recipientName,
      gramsDelivered: row.gramsDelivered,
      gramsLabel: `${formatFoodFundKg(row.gramsDelivered, locale)} kg`,
      donatedAt: row.donatedAt.toISOString(),
      storyHtml: row.storyHtml,
      photoUrls,
      videoUrl: row.videoUrl,
    };
  });
}
