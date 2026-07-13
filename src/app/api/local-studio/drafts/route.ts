import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import {
  ingestLocalStudioDrafts,
  listLocalStudioDrafts,
  parseBriefFromBody,
} from "@/lib/admin/social-content/local-ingest";
import type { SocialPlatform } from "@/lib/admin/social-content/types";
import { SOCIAL_PLATFORMS } from "@/lib/admin/social-content/types";
import { getDefaultSite } from "@/lib/site";

/** Local studio — taslak listele / gönder (Bearer CRON_SECRET). */
export async function GET(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const site = await getDefaultSite();
  const productId = new URL(req.url).searchParams.get("productId")?.trim() || undefined;
  const drafts = await listLocalStudioDrafts(site.id, productId);
  return NextResponse.json({ ok: true, drafts });
}

export async function POST(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    productId?: string;
    platforms?: string[];
    brief?: unknown;
    imagePrompt?: string;
    mediaUrls?: string[];
    mediaSource?: string;
    aiProvider?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const productId = body.productId?.trim();
  if (!productId) {
    return NextResponse.json({ error: "productId gerekli" }, { status: 400 });
  }

  const brief = parseBriefFromBody(body.brief);
  if (!brief) {
    return NextResponse.json({ error: "brief geçersiz" }, { status: 400 });
  }

  const mediaUrls = (body.mediaUrls ?? []).filter((u): u is string => typeof u === "string" && !!u.trim());
  if (!mediaUrls.length) {
    return NextResponse.json({ error: "mediaUrls gerekli" }, { status: 400 });
  }

  const platforms = (body.platforms ?? [])
    .filter((p): p is SocialPlatform => typeof p === "string" && SOCIAL_PLATFORMS.includes(p as SocialPlatform));

  const site = await getDefaultSite();
  const result = await ingestLocalStudioDrafts({
    siteId: site.id,
    siteName: site.name,
    productId,
    platforms: platforms.length ? platforms : undefined,
    brief,
    imagePrompt: body.imagePrompt?.trim() || null,
    mediaUrls,
    mediaSource: body.mediaSource?.trim() || "ai_generated",
    aiProvider: body.aiProvider?.trim() || "local-studio",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Taslak kaydedilemedi" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, drafts: result.drafts });
}
