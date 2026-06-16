import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StreetFoodFundPanel } from "@/components/admin/StreetFoodFundPanel";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function StreetFoodFundPage() {
  await requireStaffPage();

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Kampanyalar", href: "/admin/campaigns" },
          { label: "Mama Fonu" },
        ]}
        title="Sokak Dostları Mama Fonu"
        description="Sipariş gramajı kadar kuru mama biriktirme, hedef ve bağış kayıtları."
      />
      <StreetFoodFundPanel />
    </div>
  );
}
