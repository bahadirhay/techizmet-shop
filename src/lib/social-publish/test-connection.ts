import "server-only";

import type { SocialPlatform } from "@/lib/admin/social-content/types";
import { testMetaConnection } from "@/lib/social-publish/meta";
import { testLinkedInConnection } from "@/lib/social-publish/linkedin";
import { resolveSocialPublishConfig } from "@/lib/social-publish/settings";
import { testTikTokConnection } from "@/lib/social-publish/tiktok";
import type { PlatformTestResult } from "@/lib/social-publish/types";
import { testYouTubeConnection } from "@/lib/social-publish/youtube";
import { getSiteSettings } from "@/lib/site-settings";

export async function testSocialPublishPlatform(
  siteId: string,
  platform: SocialPlatform | "all",
): Promise<PlatformTestResult[]> {
  const settings = await getSiteSettings(siteId);
  const config = resolveSocialPublishConfig(settings);
  const results: PlatformTestResult[] = [];

  const run = async (p: SocialPlatform) => {
    if (p === "instagram") {
      const r = await testMetaConnection(config.meta);
      results.push({ platform: p, ok: r.ok, message: r.message });
    } else if (p === "tiktok") {
      const r = await testTikTokConnection(config.tiktok);
      results.push({ platform: p, ok: r.ok, message: r.message });
    } else if (p === "youtube") {
      const r = await testYouTubeConnection(config.youtube);
      results.push({ platform: p, ok: r.ok, message: r.message });
    } else if (p === "linkedin") {
      const r = await testLinkedInConnection(config.linkedin);
      results.push({ platform: p, ok: r.ok, message: r.message });
    }
  };

  if (platform === "all") {
    await run("instagram");
    await run("tiktok");
    await run("youtube");
    await run("linkedin");
  } else {
    await run(platform);
  }

  return results;
}
