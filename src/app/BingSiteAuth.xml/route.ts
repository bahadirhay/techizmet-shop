import { NextResponse } from "next/server";
import { getDefaultSite } from "@/lib/site";
import { getSiteSettings, getSiteSeo } from "@/lib/site-settings";

/** Bing Webmaster Tools — https://www.anatolianpaw.com/BingSiteAuth.xml */
export async function GET() {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const code = getSiteSeo(settings, site.name).bingVerification?.trim();
  if (!code) {
    return new NextResponse("Not configured", { status: 404 });
  }

  const xml = `<?xml version="1.0"?>
<users>
\t<user>${code}</user>
</users>
`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
