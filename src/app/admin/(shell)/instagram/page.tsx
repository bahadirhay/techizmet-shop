import { InstagramAdminClient } from "@/components/admin/InstagramAdminClient";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function InstagramAdminPage() {
  const auth = await requireStaffPage();
  const posts = await prisma.storeInstagramPost.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Instagram vitrin</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Ana sayfada footer öncesinde gösterilir. Yalnızca &quot;Vitrinde göster&quot; işaretli
          gönderiler yayınlanır.
        </p>
      </div>
      <InstagramAdminClient initialPosts={posts} />
    </div>
  );
}
