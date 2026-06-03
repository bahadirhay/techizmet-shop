import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ShippingLabelsPicker } from "@/components/admin/ShippingLabelsPicker";
import { loadOrdersForLabelPicker } from "@/lib/admin/load-shipping-labels";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function ShippingLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const auth = await requireStaffPage();
  const { status } = await searchParams;
  const initialStatus = status === "pending" || status === "preparing" || status === "shipped" ? status : "active";

  const orders = await loadOrdersForLabelPicker(auth.siteId, initialStatus === "active" ? "active" : undefined);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Siparişler", href: "/admin/orders" }, { label: "Kargo etiketleri" }]}
        title="Kargo Etiketi Yazdır"
        description="Siparişleri seçin, gönderici adresini kontrol edin ve termal veya A4 yazıcıdan etiket alın."
        actions={
          <Link href="/admin/orders" className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50">
            Sipariş listesi
          </Link>
        }
      />
      <ShippingLabelsPicker
        initialStatus={initialStatus}
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          status: o.status,
          marketplacePlatform: o.marketplacePlatform,
          createdAt: o.createdAt.toISOString(),
          trackingNumber: o.trackingNumber,
          carrierName: o.carrier?.name ?? null,
        }))}
      />
    </div>
  );
}
