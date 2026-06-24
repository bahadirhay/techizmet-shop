import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GeoReadinessPanel } from "@/components/admin/GeoReadinessPanel";
import { SiteDistributionPanel } from "@/components/admin/SiteDistributionPanel";
import { ADMIN_SEO_BREADCRUMB } from "@/lib/admin/nav";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function DistributionSettingsPage() {
  await requireStaffPage();

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[ADMIN_SEO_BREADCRUMB, { label: "İndeksleme & GEO" }]}
        title="İndeksleme & GEO"
        description="anatolianpaw.com — arama motorları, AI keşfi (GEO), haber kaynakları ve sosyal dizinlere ekleme planı."
      />
      <div className="space-y-8">
        <GeoReadinessPanel />
        <SiteDistributionPanel />
      </div>
    </div>
  );
}
