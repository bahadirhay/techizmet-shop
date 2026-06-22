import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SocialContentStudioClient } from "@/components/admin/SocialContentStudioClient";
import { listSocialContentDrafts } from "@/lib/admin/social-content/generate";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function SocialContentStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const auth = await requireStaffPage();
  const { productId } = await searchParams;

  const [products, drafts] = await Promise.all([
    prisma.storeProduct.findMany({
      where: { siteId: auth.siteId, published: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true, slug: true },
      take: 500,
    }),
    listSocialContentDrafts(auth.siteId, { limit: 80 }),
  ]);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Pazarlama", href: "/admin/marketing/social" },
          { label: "Sosyal içerik stüdyosu" },
        ]}
        title="Sosyal içerik stüdyosu"
        description="Ürünleriniz için Instagram, TikTok, YouTube Shorts ve LinkedIn paylaşım taslakları üretin."
      />
      <SocialContentStudioClient
        products={products}
        initialDrafts={drafts}
        preselectedProductId={productId?.trim()}
      />
    </div>
  );
}
