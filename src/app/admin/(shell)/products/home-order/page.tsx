import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { btnSecondary } from "@/components/admin/AdminForm";
import { HomeProductsSortPanel } from "@/components/admin/HomeProductsSortPanel";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function HomeProductsOrderPage() {
  const auth = await requireStaffPage();
  const products = await prisma.storeProduct.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      priceMinor: true,
      sortOrder: true,
      imageUrl: true,
    },
  });

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Ürünler", href: "/admin/products" },
          { label: "Ana sayfa sırası" },
        ]}
        title="Ana sayfa ürün sırası"
        description="Ana sayfadaki ürün kartlarının / swiper’ların sırasını sürükleyerek belirleyin."
        actions={
          <Link href="/admin/products" className={btnSecondary}>
            ← Ürün listesi
          </Link>
        }
      />
      <div className="mt-6 rounded-xl border bg-white p-5">
        <HomeProductsSortPanel products={products} />
      </div>
    </div>
  );
}
