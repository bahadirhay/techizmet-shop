import { notFound } from "next/navigation";
import { ShippingLabelsPrintClient } from "@/components/admin/ShippingLabelsPrintClient";
import { loadShippingLabelsForPrint } from "@/lib/admin/load-shipping-labels";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function ShippingLabelsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const auth = await requireStaffPage();
  const { ids } = await searchParams;
  const orderIds = ids?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  if (!orderIds.length) notFound();

  const data = await loadShippingLabelsForPrint(auth.siteId, orderIds);
  if (!data || !data.labels.length) notFound();

  return (
    <div className="shipping-labels-print-page">
      <ShippingLabelsPrintClient
        siteId={auth.siteId}
        labels={data.labels}
        initialShipFrom={data.shipFrom}
      />
    </div>
  );
}
