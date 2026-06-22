import type { PublishDraftInput } from "@/lib/social-publish/types";
import type { SocialPlatform } from "@/lib/admin/social-content/types";

function formatHashtags(tags: string[]): string {
  return tags
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .filter(Boolean)
    .join(" ");
}

/** Platforma göre yayın metni */
export function buildPublishText(draft: PublishDraftInput, platform: SocialPlatform): string {
  const tags = formatHashtags(draft.hashtags);
  const parts: string[] = [];

  if (platform === "youtube") {
    if (draft.title) parts.push(draft.title);
    if (draft.body) parts.push(draft.body);
    if (draft.script) parts.push(draft.script);
  } else if (platform === "linkedin") {
    if (draft.body) parts.push(draft.body);
    else if (draft.caption) parts.push(draft.caption);
  } else if (platform === "tiktok") {
    if (draft.hook) parts.push(draft.hook);
    if (draft.caption) parts.push(draft.caption);
    if (draft.script) parts.push(draft.script);
  } else {
    if (draft.caption) parts.push(draft.caption);
    if (draft.hook && !draft.caption?.includes(draft.hook)) parts.unshift(draft.hook);
  }

  if (draft.cta) parts.push(draft.cta);
  if (draft.productUrl) parts.push(draft.productUrl);
  if (tags) parts.push(tags);

  return parts.join("\n\n").trim();
}

export function buildPublishTitle(draft: PublishDraftInput, platform: SocialPlatform): string {
  if (platform === "youtube" || platform === "tiktok") {
    return (draft.title ?? draft.hook ?? draft.caption ?? "Ürün").slice(0, 90);
  }
  return (draft.title ?? draft.caption ?? draft.hook ?? "Ürün").slice(0, 120);
}
