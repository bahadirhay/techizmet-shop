import { notFound } from "next/navigation";
import { CustomerGroupForm } from "@/components/admin/CustomerGroupForm";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function EditCustomerGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffPage();
  const { id } = await params;
  const group = await prisma.customerGroup.findFirst({ where: { id, siteId: auth.siteId } });
  if (!group) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Grup düzenle: {group.name}</h1>
      <div className="mt-6">
        <CustomerGroupForm
          initial={{
            id: group.id,
            name: group.name,
            slug: group.slug,
            discountPercent: group.discountPercent,
            orderNumberPrefix: group.orderNumberPrefix ?? "",
            active: group.active,
            description: group.description ?? "",
            isB2b: group.isB2b,
            openAccountEnabled: group.openAccountEnabled,
            defaultPaymentTermDays: group.defaultPaymentTermDays
              ? String(group.defaultPaymentTermDays)
              : "",
            defaultCreditLimitTry: group.defaultCreditLimitMinor
              ? String(group.defaultCreditLimitMinor / 100)
              : "",
          }}
        />
      </div>
    </div>
  );
}
