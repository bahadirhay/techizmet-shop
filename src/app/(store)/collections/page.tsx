import { MirrorVitrinFrame } from "@/components/store/MirrorVitrinFrame";
import { CollectionsListFallback } from "@/components/store/CollectionsListFallback";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function CollectionsIndexPage() {
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);

  if (homepageMode === "mirror") {
    return <MirrorVitrinFrame pageKey="collections" collectionsSync />;
  }

  return <CollectionsListFallback />;
}
