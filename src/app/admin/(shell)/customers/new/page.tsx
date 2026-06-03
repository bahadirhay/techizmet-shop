import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CustomerCreateForm } from "@/components/admin/CustomerCreateForm";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function NewCustomerPage() {
  await requireStaffPage();
  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Müşteriler & Üyeler", href: "/admin/customers" },
          { label: "Yeni kayıt" },
        ]}
        title="Müşteri / üye ekle"
        description="Müşteri kartları buradan oluşturulur; muhasebede karşı taraf seçimlerinde otomatik görünür."
      />
      <CustomerCreateForm />
    </div>
  );
}
