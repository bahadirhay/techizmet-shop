import { MirrorSearchFrameClient } from "@/components/store/MirrorSearchFrameClient";
import type { VitrinCollectionProductCard } from "@/lib/mirror-collections-sync";
import { getStoreLocale } from "@/lib/i18n/server";
import { toBrandedMirrorSrc } from "@/lib/mirror-html-branding";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { resolveMirrorCollectionTexts } from "@/lib/store-static-texts";

function searchMirrorRel(locale: "tr" | "en") {
  return locale === "tr"
    ? "theme/techizmet-shop/mirror/collections/all-tr.html"
    : "theme/techizmet-shop/mirror/collections/all.html";
}

async function loadSearchProducts(siteId: string, term: string): Promise<VitrinCollectionProductCard[]> {
  const q = term.trim();
  if (q.length < 2) return [];

  const contains = { contains: q, mode: "insensitive" as const };
  const rows = await prisma.storeProduct.findMany({
    where: {
      siteId,
      published: true,
      OR: [
        { title: contains },
        { description: contains },
        { descriptionHtml: contains },
        { sku: contains },
        { slug: contains },
        { barcode: contains },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 48,
    select: {
      slug: true,
      title: true,
      imageUrl: true,
      priceMinor: true,
      compareAtMinor: true,
      stockQty: true,
      lowStockThreshold: true,
      badgesJson: true,
    },
  });

  return rows;
}

/** Techizmet Shop vitrin — /search?q= sonuç sayfası */
export async function MirrorSearchFrame({ q = "" }: { q?: string }) {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const mirrorTexts = resolveMirrorCollectionTexts(locale, settings.store?.texts);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);
  const term = q.trim();
  const isTr = locale === "tr";
  const products = await loadSearchProducts(site.id, term);

  const pageTitle =
    term.length >= 2
      ? isTr
        ? `Arama: ${term}`
        : `Search: ${term}`
      : isTr
        ? "Arama"
        : "Search";

  let pageDescription = "";
  if (term.length >= 2) {
    pageDescription = products.length
      ? isTr
        ? `${products.length} ürün bulundu`
        : `${products.length} products found`
      : isTr
        ? `"${term}" için sonuç bulunamadı`
        : `No results for "${term}"`;
  } else {
    pageDescription = isTr
      ? "Aramak için en az 2 karakter girin."
      : "Enter at least 2 characters to search.";
  }

  const src = toBrandedMirrorSrc(searchMirrorRel(locale), "collections-all");

  return (
    <MirrorSearchFrameClient
      src={src}
      title={pageTitle}
      searchTerm={term}
      pageTitle={pageTitle}
      pageDescription={pageDescription}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
      productsFromAdmin={products}
      mirrorTexts={mirrorTexts}
    />
  );
}
