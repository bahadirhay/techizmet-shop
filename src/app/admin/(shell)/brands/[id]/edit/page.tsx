import { notFound } from "next/navigation";
import { BrandForm } from "@/components/admin/BrandForm";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffPage();
  const { id } = await params;
  const brand = await prisma.storeBrand.findFirst({ where: { id, siteId: auth.siteId } });
  if (!brand) notFound();

  return (
    <BrandForm
      initial={{
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        logoUrl: brand.logoUrl ?? "",
      }}
    />
  );
}
