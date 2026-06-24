import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BingWebmasterPanel } from "@/components/admin/BingWebmasterPanel";
import { ADMIN_SEO_BREADCRUMB } from "@/lib/admin/nav";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function BingWebmasterPage() {
  await requireStaffPage();

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[ADMIN_SEO_BREADCRUMB, { label: "Bing Webmaster" }]}
        title="Bing Webmaster"
        description="Bing panelindeki önerileri (IndexNow, meta açıklama, site haritası) buradan yönetin."
      />
      <BingWebmasterPanel />
    </div>
  );
}
