import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SiteSeoDashboardClient } from "@/components/admin/SiteSeoDashboardClient";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function SeoDashboardPage() {
  await requireStaffPage();

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Ayarlar & Sistem", href: "/admin/theme" },
          { label: "SEO Komuta Merkezi" },
        ]}
        title="SEO Komuta Merkezi"
        description="Tüm site ve ürünlerin SEO sağlığını tarayın; Claude ile meta, içerik ve görsel alt metinlerini toplu güncelleyin."
      />
      <SiteSeoDashboardClient />
    </div>
  );
}
