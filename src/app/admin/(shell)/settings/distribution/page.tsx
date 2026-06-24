import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GeoReadinessPanel } from "@/components/admin/GeoReadinessPanel";
import { SiteDistributionPanel } from "@/components/admin/SiteDistributionPanel";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function DistributionSettingsPage() {
  await requireStaffPage();

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Ayarlar & Sistem", href: "/admin/theme" },
          { label: "Dizin & İndeksleme" },
        ]}
        title="Dizin & İndeksleme"
        description="anatolianpaw.com — arama motorları, AI keşfi (GEO), haber kaynakları ve sosyal dizinlere ekleme planı."
      />
      <div className="space-y-8">
        <GeoReadinessPanel />
        <SiteDistributionPanel />
      </div>
    </div>
  );
}
