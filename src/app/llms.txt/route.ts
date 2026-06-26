import { NextResponse } from "next/server";
import { buildLlmsTxt } from "@/lib/seo/llms-builder";
import { getDefaultSite } from "@/lib/site";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/** AI sistemleri için küratörlü site özeti — https://llmstxt.org */
export async function GET() {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const body = await buildLlmsTxt(site.id, settings, site.name);

  // Cache-Control next.config headers() ile veriliyor (s-maxage strip edilmesin).
  return new NextResponse(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
