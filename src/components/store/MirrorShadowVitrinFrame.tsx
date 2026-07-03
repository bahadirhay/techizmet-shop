import { MirrorShadowHost } from "@/components/store/MirrorShadowHost";
import { buildMirrorHtmlCore } from "@/lib/mirror-html-processor";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import { getDefaultSite } from "@/lib/site";
import {
  getVitrinPage,
  vitrinMirrorFileRel,
  type VitrinPageKey,
} from "@/lib/mirror-vitrin-pages";
import { notFound } from "next/navigation";

/**
 * De-iframe pilotu (Faz B) — MirrorVitrinFrame'in iframe'siz alternatifi.
 * Yalnızca statik/metin vitrin sayfaları için (privacy-policy vb.).
 * HTML sunucuda buildMirrorHtmlCore ile üretilir (nav/footer/branding gömülü),
 * ardından Shadow DOM içine yerleştirilir.
 */
export async function MirrorShadowVitrinFrame({ pageKey }: { pageKey: VitrinPageKey }) {
  const def = getVitrinPage(pageKey);
  if (!def) notFound();

  const site = await getDefaultSite();
  const locale = await getStoreLocaleFromHeaders();
  const normalized = vitrinMirrorFileRel(pageKey, locale);

  const html = await buildMirrorHtmlCore({
    normalized,
    locale,
    siteId: site.id,
    siteName: site.name,
    pageKey,
  });

  return (
    <div className="kn-home-mirror kn-home-mirror--ready relative min-h-screen w-full">
      <MirrorShadowHost html={html} />
    </div>
  );
}
