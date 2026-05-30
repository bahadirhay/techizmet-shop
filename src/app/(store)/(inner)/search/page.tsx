import Link from "next/link";
import { Suspense } from "react";
import { ProductCard } from "@/components/store/ProductCard";
import { MirrorSearchFrame } from "@/components/store/MirrorSearchFrame";
import { StoreSearchForm } from "@/components/store/StoreSearchForm";
import { prisma } from "@/lib/prisma";
import { getLoggedInCustomerPricing } from "@/lib/store/customer-pricing";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

async function SearchResults({ q }: { q: string }) {
  const site = await getDefaultSite();
  const pricing = await getLoggedInCustomerPricing(site.id);
  const memberPricing = pricing;
  const term = q.trim();
  if (term.length < 2) {
    return (
      <p className="kn-search-hint">Aramak için en az 2 karakter girin.</p>
    );
  }

  const contains = { contains: term, mode: "insensitive" as const };
  const products = await prisma.storeProduct.findMany({
    where: {
      siteId: site.id,
      published: true,
      OR: [
        { title: contains },
        { description: contains },
        { sku: contains },
        { slug: contains },
        { barcode: contains },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 48,
    include: { variants: { orderBy: { sortOrder: "asc" } } },
  });

  if (products.length === 0) {
    return (
      <div className="kn-search-empty">
        <p>
          <strong>&quot;{term}&quot;</strong> için sonuç bulunamadı.
        </p>
        <Link href="/collections/all" className="kn-btn kn-btn--primary">
          Tüm ürünler
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="kn-search-count">{products.length} ürün bulundu</p>
      <div className="kn-product-grid">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            productId={p.id}
            slug={p.slug}
            title={p.title}
            imageUrl={p.imageUrl}
            badgesJson={p.badgesJson}
            stockQty={p.stockQty}
            lowStockThreshold={p.lowStockThreshold}
            variantOptionName={p.variantOptionName}
            variants={p.variants}
            priceMinor={p.priceMinor}
            compareAtMinor={p.compareAtMinor}
            memberPricing={memberPricing}
          />
        ))}
      </div>
    </>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);

  if (homepageMode === "mirror") {
    return <MirrorSearchFrame q={q} />;
  }

  return (
    <div className="kn-section kn-search-page">
      <h1>Arama</h1>
      <Suspense fallback={null}>
        <StoreSearchForm className="kn-search-form kn-search-form--page" />
      </Suspense>
      <Suspense fallback={<p className="kn-search-hint">Yükleniyor…</p>}>
        <SearchResults q={q} />
      </Suspense>
    </div>
  );
}
