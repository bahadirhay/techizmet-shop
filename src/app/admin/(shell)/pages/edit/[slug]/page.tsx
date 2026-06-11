import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

/** CMS sayfa — slug ile blok editörüne yönlendir (ör. mesafeli-satis) */
export default async function EditCmsPageBySlugRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const auth = await requireStaffPage();
  const { slug } = await params;
  if (slug === "mesafeli-satis") {
    redirect("/admin/integrations#mesafeli-satis-legal");
  }
  const page = await prisma.shopPage.findFirst({
    where: { siteId: auth.siteId, slug },
    select: { id: true },
  });
  if (!page) notFound();
  redirect(`/admin/pages/${page.id}/edit`);
}
