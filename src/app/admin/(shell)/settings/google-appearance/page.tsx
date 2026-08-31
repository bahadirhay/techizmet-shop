import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GoogleAppearanceScanPanel } from "@/components/admin/GoogleAppearanceScanPanel";
import { ProductSnippetHealthPanel } from "@/components/admin/ProductSnippetHealthPanel";
import { ADMIN_SEO_BREADCRUMB } from "@/lib/admin/nav";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function GoogleAppearancePage() {
  await requireStaffPage();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumb={[ADMIN_SEO_BREADCRUMB, { label: "Google Görünüm" }]}
        title="Google görünüm temizliği"
        description="Vitrin sayfalarını ve kayıtlı metinleri tarar; eski şablon başlıklarını (Skincare, Glow, theking-noor) bulur ve düzeltir. Ürün snippet / aggregateRating sağlığını da kontrol eder."
      />
      <ProductSnippetHealthPanel />
      <GoogleAppearanceScanPanel />
    </div>
  );
}
