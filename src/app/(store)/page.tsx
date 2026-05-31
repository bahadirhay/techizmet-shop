import { MirrorVitrinFrame } from "@/components/store/MirrorVitrinFrame";
import { StorePublicBlocks } from "@/components/store/StorePublicBlocks";
import { headers } from "next/headers";
import { getStoreMessages } from "@/lib/i18n/messages";
import { localeFromCookieValue } from "@/lib/i18n/locale";
import { getStoreHomepageBlocks } from "@/lib/store-homepage-blocks";
import { getHomepageMode, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { resolveStoreBlockMessages } from "@/lib/store-static-texts";

export const revalidate = 300;

export default async function HomePage() {
  const site = await getDefaultSite();
  const h = await headers();
  const locale = localeFromCookieValue(h.get("x-shop-locale") ?? undefined) ?? "tr";
  const settings = await getSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);

  /** Varsayılan: Techizmet Shop şablon mirror (en-us.html). Blok modu yalnızca admin’de açıkça seçilirse. */
  if (homepageMode === "mirror") {
    return <MirrorVitrinFrame pageKey="home" />;
  }

  const messages = getStoreMessages(locale);
  const blocks = await getStoreHomepageBlocks(locale);
  return (
    <StorePublicBlocks
      blocks={blocks}
      messages={resolveStoreBlockMessages(locale, settings.store?.texts, messages.blocks)}
    />
  );
}
