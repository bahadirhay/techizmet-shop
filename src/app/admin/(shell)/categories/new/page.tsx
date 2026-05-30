import { CategoryForm } from "@/components/admin/CategoryForm";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function NewCategoryPage() {
  const auth = await requireStaffPage();
  const categories = await prisma.storeCategory.findMany({
    where: { siteId: auth.siteId },
    orderBy: { title: "asc" },
    include: { parent: { select: { title: true } } },
  });

  return (
    <CategoryForm
      initial={{
        title: "",
        slug: "",
        parentId: "",
        description: "",
        imageUrl: "",
        seoTitle: "",
        seoDescription: "",
        sortOrder: "0",
      }}
      parents={categories.map((c) => ({
        id: c.id,
        title: c.title,
        parentTitle: c.parent?.title ?? null,
      }))}
    />
  );
}
