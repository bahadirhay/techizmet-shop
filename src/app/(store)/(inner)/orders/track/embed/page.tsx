import { Suspense } from "react";
import { OrderTrackForm } from "@/components/store/OrderTrackForm";
import { OrderTrackEmbedStyles } from "@/components/store/OrderTrackEmbedStyles";

/** Vitrin iframe — hafif CSS + form */
export default function OrderTrackEmbedPage() {
  return (
    <div className="kn-order-track-embed-root">
      <OrderTrackEmbedStyles />
      <Suspense fallback={<p>Yükleniyor…</p>}>
        <OrderTrackForm />
      </Suspense>
    </div>
  );
}
