import { NextResponse } from "next/server";
import type { SocialPlatform } from "@/lib/admin/social-content/types";
import { SOCIAL_PLATFORMS } from "@/lib/admin/social-content/types";
import { testSocialPublishPlatform } from "@/lib/social-publish/test-connection";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as { platform?: string };
  const platform = body.platform?.trim() as SocialPlatform | "all" | undefined;
  const target =
    platform && (platform === "all" || SOCIAL_PLATFORMS.includes(platform as SocialPlatform))
      ? platform
      : "all";

  const results = await testSocialPublishPlatform(auth.siteId, target);
  const ok = results.every((r) => r.ok);
  return NextResponse.json({ ok, results });
}
