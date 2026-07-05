import { revalidatePath, revalidateTag } from "next/cache";
import { storeMirrorTag } from "@/lib/cache/store-cache";

export function revalidateBlogPaths(
  siteId: string,
  slug: string,
  published?: boolean,
) {
  revalidatePath("/blogs/news");
  revalidatePath(`/blogs/news/${slug}`);
  if (published) revalidatePath("/");
  revalidateTag("store-blog", { expire: 0 });
  revalidateTag(storeMirrorTag(siteId), { expire: 0 });
}
