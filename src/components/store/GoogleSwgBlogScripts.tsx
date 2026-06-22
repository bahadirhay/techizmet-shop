import { GoogleSwgBasicScripts } from "@/components/store/GoogleSwgBasicScripts";
import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { resolveGoogleSwgConfig } from "@/lib/seo/google-swg-settings";
import { getDefaultSite } from "@/lib/site";

/** /blogs/news ve /blogs/news/[slug] için Google Haberler SWG etiketi */
export async function GoogleSwgBlogScripts() {
  const site = await getDefaultSite();
  const settings = await getCachedParsedSiteSettings(site.id);
  const config = resolveGoogleSwgConfig(settings);
  if (!config) return null;
  return <GoogleSwgBasicScripts config={config} />;
}
