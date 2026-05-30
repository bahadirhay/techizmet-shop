import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffPage();
  const { id } = await params;
  const category = await prisma.storeCategory.findFirst({ where: { id, siteId: auth.siteId } });
  if (!category) notFound();

  const categories = await prisma.storeCategory.findMany({
    where: { siteId: auth.siteId, NOT: { id } },
    orderBy: { title: "asc" },
    include: { parent: { select: { title: true } } },
  });

  return (
    <CategoryForm
      initial={{
        id: category.id,
        title: category.title,
        slug: category.slug,
        parentId: category.parentId ?? "",
        description: category.description ?? "",
        imageUrl: category.imageUrl ?? "",
        seoTitle: category.seoTitle ?? "",
        seoDescription: category.seoDescription ?? "",
        sortOrder: String(category.sortOrder),
      }}
      parents={categories.map((c) => ({
        id: c.id,
        title: c.title,
        parentTitle: c.parent?.title ?? null,
      }))}
    />
  );
}
