import "server-only";

import type { InstagramFeedPostDTO } from "@/lib/instagram-feed-card";
import { prisma } from "@/lib/prisma";

export async function getStoreInstagramFeedPosts(siteId: string): Promise<InstagramFeedPostDTO[]> {
  const rows = await prisma.storeInstagramPost.findMany({
    where: { siteId, published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 12,
    select: {
      id: true,
      permalink: true,
      caption: true,
      mediaType: true,
      mediaUrl: true,
      thumbnailUrl: true,
      title: true,
      linkHref: true,
      linkLabel: true,
      coverImage: true,
    },
  });
  return rows;
}
