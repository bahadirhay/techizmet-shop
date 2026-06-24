import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BingWebmasterPanel } from "@/components/admin/BingWebmasterPanel";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function BingWebmasterPage() {
  await requireStaffPage();

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Ayarlar & Sistem", href: "/admin/theme" },
          { label: "Bing Webmaster" },
        ]}
        title="Bing Webmaster"
        description="Bing panelindeki önerileri (IndexNow, meta açıklama, site haritası) buradan yönetin."
      />
      <BingWebmasterPanel />
    </div>
  );
}
