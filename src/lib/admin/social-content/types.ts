export const SOCIAL_PLATFORMS = ["instagram", "tiktok", "youtube", "linkedin"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_DRAFT_STATUSES = ["draft", "approved", "scheduled", "published", "failed"] as const;
export type SocialDraftStatus = (typeof SOCIAL_DRAFT_STATUSES)[number];

export type SocialPlatformContent = {
  title?: string;
  caption?: string;
  hook?: string;
  script?: string;
  body?: string;
  hashtags: string[];
  cta?: string;
};

export type SocialContentPack = Record<SocialPlatform, SocialPlatformContent>;

export type SocialContentDraftDTO = {
  id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  platform: SocialPlatform;
  format: string;
  status: SocialDraftStatus;
  title: string | null;
  caption: string | null;
  hook: string | null;
  script: string | null;
  body: string | null;
  hashtags: string[];
  cta: string | null;
  productUrl: string | null;
  mediaUrls: string[];
  aiProvider: string | null;
  publishedUrl: string | null;
  publishedAt: string | null;
  publishError: string | null;
  scheduledAt: string | null;
  updatedAt: string;
};

export function parseHashtagsJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function serializeHashtags(tags: string[]): string | null {
  const clean = tags.map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
  return clean.length ? JSON.stringify(clean) : null;
}

export function parseMediaUrlsJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function serializeMediaUrls(urls: string[]): string | null {
  const clean = urls.map((u) => u.trim()).filter(Boolean);
  return clean.length ? JSON.stringify(clean) : null;
}

export function platformLabel(platform: SocialPlatform): string {
  const labels: Record<SocialPlatform, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube Shorts",
    linkedin: "LinkedIn",
  };
  return labels[platform];
}

export function platformFormat(platform: SocialPlatform): string {
  if (platform === "youtube") return "short";
  if (platform === "tiktok") return "reel";
  return "post";
}

/** Panoya kopyalanacak tam metin */
export function draftToClipboardText(d: SocialContentDraftDTO): string {
  const tags = d.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  const parts: string[] = [];
  if (d.title) parts.push(d.title);
  if (d.hook) parts.push(d.hook);
  if (d.caption) parts.push(d.caption);
  if (d.body) parts.push(d.body);
  if (d.script) parts.push(`---\nVideo metni:\n${d.script}`);
  if (d.cta) parts.push(d.cta);
  if (d.productUrl) parts.push(d.productUrl);
  if (tags) parts.push(tags);
  return parts.join("\n\n").trim();
}
