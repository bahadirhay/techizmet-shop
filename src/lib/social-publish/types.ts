import type { SocialPlatform } from "@/lib/admin/social-content/types";

export type PublishResult = {
  ok: boolean;
  publishedUrl?: string;
  externalId?: string;
  error?: string;
  /** YouTube gibi video gerektiren platformlar */
  manualOnly?: boolean;
};

export type PublishDraftInput = {
  title: string | null;
  caption: string | null;
  hook: string | null;
  script: string | null;
  body: string | null;
  hashtags: string[];
  cta: string | null;
  productUrl: string | null;
  mediaUrls: string[];
};

export type PlatformTestResult = {
  platform: SocialPlatform;
  ok: boolean;
  message: string;
};
