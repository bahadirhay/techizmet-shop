import { notFound } from "next/navigation";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { getMirrorCollectionImage } from "@/lib/mirror-collection-images";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffPage();
  const { id } = await params;
  const collection = await prisma.storeCollection.findFirst({ where: { id, siteId: auth.siteId } });
  if (!collection) notFound();

  const mirrorImage = collection.imageUrl ? null : getMirrorCollectionImage(collection.slug);
  const displayImage = collection.imageUrl ?? mirrorImage ?? "";

  return (
    <CollectionForm
      initial={{
        id: collection.id,
        title: collection.title,
        slug: collection.slug,
        description: collection.description ?? "",
        imageUrl: displayImage,
        sortOrder: String(collection.sortOrder),
      }}
      imageFromMirrorOnly={Boolean(mirrorImage && !collection.imageUrl)}
    />
  );
}
