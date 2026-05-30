import { CartPageClient } from "@/components/cart/CartPageClient";
import { MirrorCartFrame } from "@/components/store/MirrorCartFrame";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

export default async function CartPage() {
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  if (homepageMode === "mirror") {
    return <MirrorCartFrame />;
  }

  return (
    <div className="kn-section">
      <CartPageClient />
    </div>
  );
}
