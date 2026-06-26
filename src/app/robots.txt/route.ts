import { buildStoreRobots, serializeRobots } from "@/lib/seo/robots-builder";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * robots.txt — route handler olarak güçlü edge cache ile.
 * MetadataRoute (robots.ts) varsayılan `no-store` veriyordu; her istek soğuk
 * serverless + DB'ye düşüyor, mobil Lighthouse ağ kısıtlamasında "indirilemedi"
 * uyarısı çıkıyordu. s-maxage ile CDN'de cache'lenip hızlı yanıt veriyor.
 */
export async function GET() {
  let body: string;

  if (!process.env.DATABASE_URL) {
    body = serializeRobots({
      rules: { userAgent: "*", disallow: "/" },
      sitemap: `${getPublicSiteUrl()}/sitemap.xml`,
    });
  } else {
    const site = await getDefaultSite();
    const settings = await getSiteSettings(site.id);
    body = serializeRobots(buildStoreRobots(settings, site.name));
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
