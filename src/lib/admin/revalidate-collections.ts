import { revalidatePath } from "next/cache";

/** Koleksiyon CRUD sonrası vitrin önbelleğini temizle */
export function revalidateCollectionPaths(slug?: string) {
  revalidatePath("/collections");
  revalidatePath("/collections/all");
  if (slug) {
    revalidatePath(`/collections/${slug}`);
  }
}
