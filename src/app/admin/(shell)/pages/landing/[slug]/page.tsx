import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LandingPageEditor } from "@/components/admin/LandingPageEditor";
import { findLandingIntentBySlug } from "@/lib/seo/search-intent";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function LandingPageAdminRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireStaffPage();
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw).trim().toLowerCase();
  const intent = findLandingIntentBySlug(slug);
  if (!intent) notFound();

  const title = intent.h1 ?? intent.query;

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Sayfalar", href: "/admin/pages" },
          { label: "SEO Landing", href: "/admin/pages#seo-landings" },
          { label: title },
        ]}
        title={title}
        description="Hero başlığı, tek cümle ve giriş metnini buradan düzenleyin. Kaydettikten sonra canlı sayfayı yenileyin."
      />
      <LandingPageEditor slug={slug} />
    </div>
  );
}
