import { Suspense } from "react";
import { MirrorOrderTrackFrame } from "@/components/store/MirrorOrderTrackFrame";
import { OrderTrackForm } from "@/components/store/OrderTrackForm";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

type Props = { searchParams: Promise<{ order?: string }> };

export default async function OrderTrackPage({ searchParams }: Props) {
  const { order } = await searchParams;
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);

  if (homepageMode === "mirror") {
    return <MirrorOrderTrackFrame initialOrder={order} />;
  }

  return (
    <div className="kn-section">
      <Suspense fallback={<p>Yükleniyor…</p>}>
        <OrderTrackForm />
      </Suspense>
    </div>
  );
}
