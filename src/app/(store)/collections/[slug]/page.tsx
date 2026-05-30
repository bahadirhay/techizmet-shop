import Link from "next/link";
import { notFound } from "next/navigation";
import { MirrorCollectionFrame } from "@/components/store/MirrorCollectionFrame";
import { ProductGridBlock } from "@/components/store/ProductGridBlock";
import { getStoreLocale } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { slug } = await params;
  const { category: categorySlug, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  const locale = await getStoreLocale();

  if (categorySlug?.trim()) {
    const cat = await prisma.storeCategory.findFirst({
      where: { siteId: site.id, slug: categorySlug.trim(), active: true },
    });
    if (!cat) notFound();
    const title = cat.title;

    if (homepageMode === "mirror") {
      return (
        <MirrorCollectionFrame
          slug="all"
          categorySlug={categorySlug.trim()}
          locale={locale}
          title={title}
          page={page}
        />
      );
    }

    return (
      <div className="kn-section kn-category-products">
        <h1 className="kn-section__title">{title}</h1>
        <ProductGridBlock limit={48} categorySlug={categorySlug.trim()} />
        <p className="mt-8 text-center">
          <Link href="/collections/all">← Tüm ürünler</Link>
        </p>
      </div>
    );
  }

  if (homepageMode === "mirror" && slug === "all") {
    return <MirrorCollectionFrame slug="all" locale={locale} page={page} />;
  }

  const collection = await prisma.storeCollection.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
  });

  if (homepageMode === "mirror") {
    if (collection) {
      return <MirrorCollectionFrame slug={slug} locale={locale} page={page} />;
    }
  }
  if (!collection && slug !== "all") notFound();

  return (
    <div className="kn-section">
      <h1 className="kn-section__title">{collection?.title ?? "Tüm ürünler"}</h1>
      <ProductGridBlock limit={24} collectionSlug={slug === "all" ? undefined : slug} />
      <p className="mt-8 text-center">
        <Link href="/">← Ana sayfa</Link>
      </p>
    </div>
  );
}
