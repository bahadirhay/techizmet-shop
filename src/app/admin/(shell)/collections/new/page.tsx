import { CollectionForm } from "@/components/admin/CollectionForm";

export default function NewCollectionPage() {
  return (
    <CollectionForm initial={{ title: "", slug: "", description: "", imageUrl: "", sortOrder: "0" }} />
  );
}
