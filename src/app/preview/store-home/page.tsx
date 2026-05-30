import { cookies } from "next/headers";
import { StorePublicBlocks } from "@/components/store/StorePublicBlocks";
import { parseBlocks } from "@/lib/blocks/schema";
import { getStoreMessages } from "@/lib/i18n/messages";
import { getStoreLocale } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { resolveStoreBlockMessages } from "@/lib/store-static-texts";

/** Admin ana sayfa editörü — gerçek ürünlerle vitrin önizlemesi (çerezden bloklar) */
export default async function StoreHomePreviewPage() {
  const raw = (await cookies()).get("preview-home-blocks")?.value;
  const blocks = parseBlocks(raw ? decodeURIComponent(raw) : "[]");
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const settings = await getSiteSettings(site.id);
  const messages = getStoreMessages(locale);

  if (blocks.length === 0) {
    return (
      <p className="p-12 text-center text-sm text-zinc-500">
        Sol panelden blok ekleyin — önizleme burada güncellenir.
      </p>
    );
  }

  return (
    <StorePublicBlocks
      blocks={blocks}
      messages={resolveStoreBlockMessages(locale, settings.store?.texts, messages.blocks)}
    />
  );
}
