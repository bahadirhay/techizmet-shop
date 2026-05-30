import { revalidatePath } from "next/cache";

export function revalidateCategoryPaths(slug?: string) {
  revalidatePath("/collections");
  revalidatePath("/collections/all");
  if (slug) {
    revalidatePath(`/collections/all?category=${slug}`);
  }
}
