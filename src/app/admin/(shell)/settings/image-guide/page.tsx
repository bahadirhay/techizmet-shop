import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ImageGuideView } from "@/components/admin/ImageGuideView";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function ImageGuidePage() {
  await requireStaffPage();

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Ayarlar", href: "/admin/settings/seo" },
          { label: "Görsel boyutları" },
        ]}
        title="Görsel boyutları kılavuzu"
        description="Vitrin, pazaryeri ve admin yükleme alanları için önerilen piksel boyutları ve en-boy oranları."
      />
      <ImageGuideView />
    </div>
  );
}
