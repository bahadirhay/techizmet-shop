import { NextResponse } from "next/server";
import { getDefaultSite } from "@/lib/site";
import { ensureIndexNowKey } from "@/lib/seo/indexnow";
import { getSiteDistribution } from "@/lib/seo/distribution-settings";
import { getSiteSettings } from "@/lib/site-settings";

/** IndexNow doğrulama — https://www.anatolianpaw.com/indexnow-key.txt */
export async function GET() {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const key = ensureIndexNowKey(getSiteDistribution(settings));

  return new NextResponse(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
