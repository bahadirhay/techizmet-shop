import { CustomerGroupForm } from "@/components/admin/CustomerGroupForm";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function NewCustomerGroupPage() {
  await requireStaffPage();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Yeni üye grubu</h1>
      <div className="mt-6">
        <CustomerGroupForm />
      </div>
    </div>
  );
}
