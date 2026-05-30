import { notFound } from "next/navigation";
import { ShippingCarrierForm } from "@/components/admin/ShippingCarrierForm";
import { carrierToForm, ratesToForm } from "@/lib/admin/shipping-form";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function EditShippingPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffPage();
  const { id } = await params;
  const carrier = await prisma.shippingCarrier.findFirst({
    where: { id, siteId: auth.siteId },
    include: { rates: { orderBy: { sortOrder: "asc" } } },
  });
  if (!carrier) notFound();

  return (
    <ShippingCarrierForm
      initial={carrierToForm(carrier)}
      initialRates={ratesToForm(carrier.rates)}
    />
  );
}
