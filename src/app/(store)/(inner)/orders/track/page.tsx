import { Suspense } from "react";
import { OrderTrackForm } from "@/components/store/OrderTrackForm";

export default function OrderTrackPage() {
  return (
    <div className="kn-section">
      <Suspense fallback={<p>Yükleniyor…</p>}>
        <OrderTrackForm />
      </Suspense>
    </div>
  );
}
