import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SitePerformancePanel } from "@/components/admin/SitePerformancePanel";
import { ADMIN_SEO_BREADCRUMB } from "@/lib/admin/nav";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function SitePerformancePage() {
  await requireStaffPage();

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[ADMIN_SEO_BREADCRUMB, { label: "Site Performansı" }]}
        title="Site Performansı"
        description="Lighthouse uyarılarının anlamı, görsel/SEO kontrolleri ve tek tıkla düzeltme — AI destekli ürün meta güncellemesi dahil."
      />
      <SitePerformancePanel />
    </div>
  );
}
