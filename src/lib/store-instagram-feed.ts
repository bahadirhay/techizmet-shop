import "server-only";

import { unstable_cache } from "next/cache";
import type { InstagramFeedPostDTO } from "@/lib/instagram-feed-card";
import { STORE_PUBLIC_REVALIDATE_SEC, storeMirrorTag } from "@/lib/cache/store-cache";
import { prisma } from "@/lib/prisma";

async function loadStoreInstagramFeedPosts(siteId: string): Promise<InstagramFeedPostDTO[]> {
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

export function getStoreInstagramFeedPosts(siteId: string): Promise<InstagramFeedPostDTO[]> {
  return unstable_cache(
    () => loadStoreInstagramFeedPosts(siteId),
    ["store-instagram-feed", siteId],
    { revalidate: STORE_PUBLIC_REVALIDATE_SEC, tags: [storeMirrorTag(siteId)] },
  )();
}
