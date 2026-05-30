import { notFound, redirect } from "next/navigation";
import { ShopPageEditor } from "@/components/editor/ShopPageEditor";
import { ensureEditorBlocks } from "@/lib/blocks/editor-ids";
import { parseBlocks } from "@/lib/blocks/schema";
import { MIRROR_CONTENT_PAGE_SLUGS } from "@/lib/mirror-vitrin-pages";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function PageEditRoute({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffPage();
  const { id } = await params;
  const page = await prisma.shopPage.findFirst({ where: { id, siteId: auth.siteId } });
  if (!page) notFound();

  if (page.slug === "home") redirect("/admin/home");

  if ((MIRROR_CONTENT_PAGE_SLUGS as readonly string[]).includes(page.slug)) {
    redirect(`/admin/pages/vitrin/${page.slug}`);
  }

  const initialBlocks = ensureEditorBlocks(parseBlocks(page.blocks));

  return (
    <div className="-mx-4 -mt-2 md:-mx-8 md:-mt-4">
      <ShopPageEditor
        pageId={page.id}
        pageTitle={page.title}
        pageSlug={page.slug}
        initialBlocks={initialBlocks}
      />
    </div>
  );
}
