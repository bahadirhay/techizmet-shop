import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
        description="anatolianpaw.com — arama motorları, haber kaynakları, blog agregatörleri ve sosyal dizinlere ekleme planı."
      />
      <SiteDistributionPanel />
    </div>
  );
}
