import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SearchIntentPanel } from "@/components/admin/SearchIntentPanel";
import { ADMIN_SEO_BREADCRUMB } from "@/lib/admin/nav";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function SearchIntentPage() {
  await requireStaffPage();

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[ADMIN_SEO_BREADCRUMB, { label: "Hedef Aramalar" }]}
        title="Hedef Aramalar"
        description="Google ve AI aramalarında öne çıkmak istediğiniz sorgular — meta, schema ve ürün optimizasyonu."
      />
      <SearchIntentPanel />
    </div>
  );
}
