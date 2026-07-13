import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { getDefaultSite } from "@/lib/site";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { getSiteSettings, getSiteBranding } from "@/lib/site-settings";
import { resolveSocialPublishConfig } from "@/lib/social-publish/settings";

/** Local studio — Meta/shop ayarları (yalnızca CRON_SECRET ile). */
export async function GET(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const meta = resolveSocialPublishConfig(settings).meta;
  const branding = getSiteBranding(settings);

  return NextResponse.json({
    siteId: site.id,
    siteName: site.name,
    shopUrl: getPublicSiteUrl(),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    branding: {
      logoUrl: branding.logoUrl,
      logoUrlLight: branding.logoUrlLight,
    },
    meta: {
      enabled: meta.enabled,
      instagramAccountId: meta.instagramAccountId,
      pageId: meta.pageId,
      accessToken: meta.accessToken,
    },
    studio: settings.socialPublish?.studio ?? {},
  });
}
