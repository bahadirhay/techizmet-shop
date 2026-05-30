import { revalidatePath } from "next/cache";

export function revalidateBlogPaths(slug: string, published?: boolean) {
  revalidatePath("/blogs/news");
  revalidatePath(`/blogs/news/${slug}`);
  if (published) revalidatePath("/");
}
