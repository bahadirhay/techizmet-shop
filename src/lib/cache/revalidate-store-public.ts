import "server-only";

import { revalidateTag } from "next/cache";
import {
  storeMirrorTag,
  storeNavTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";

/** Admin kaydı sonrası vitrin önbelleğini temizle */
export function revalidateStorePublicCache(siteId: string, productSlug?: string) {
  // { expire: 0 } → anında sona erdir; bir sonraki istek taze veri alır (admin kayıt sonrası gerekli)
  revalidateTag(storeSettingsTag(siteId), { expire: 0 });
  revalidateTag(storeNavTag(siteId), { expire: 0 });
  revalidateTag(storeMirrorTag(siteId), { expire: 0 });
  revalidateTag("store-products", { expire: 0 });
  if (productSlug?.trim()) revalidateTag(`product:${productSlug.trim()}`, { expire: 0 });
}
