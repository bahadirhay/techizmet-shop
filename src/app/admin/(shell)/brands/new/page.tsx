import { BrandForm } from "@/components/admin/BrandForm";

export default function NewBrandPage() {
  return <BrandForm initial={{ name: "", slug: "", logoUrl: "" }} />;
}
