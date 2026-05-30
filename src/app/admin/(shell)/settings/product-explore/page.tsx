import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductExploreSettingsForm } from "@/components/admin/ProductExploreSettingsForm";
import {
  getDefaultProductExploreLooks,
  getProductPageBottomSettings,
  parseSiteSettings,
} from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function ProductExploreSettingsPage() {
  const auth = await requireStaffPage();
  const [site, products] = await Promise.all([
    prisma.storeSite.findUnique({ where: { id: auth.siteId } }),
    prisma.storeProduct.findMany({
      where: { siteId: auth.siteId, published: true },
      orderBy: { title: "asc" },
      select: { slug: true, title: true },
    }),
  ]);

  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const initialLooks = getDefaultProductExploreLooks(settings);
  const initialPageBottom = getProductPageBottomSettings(settings);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Sayfalar", href: "/admin/pages" },
          { label: "Ürün sayfası altı" },
        ]}
        title="Ürün sayfası altı"
        description="Kayan yazı, Keşfet, açılış metni ve video metinleri — tüm ürün detay sayfalarında. Her bölüm ayrı açılıp kapatılabilir."
      />
      <ProductExploreSettingsForm
        initialLooks={initialLooks}
        initialPageBottom={initialPageBottom}
        productOptions={products.map((p) => ({ slug: p.slug, title: p.title }))}
      />
    </div>
  );
}
