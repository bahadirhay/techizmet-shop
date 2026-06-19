import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import type { MirrorNavItem } from "@/lib/mirror-nav-overlay";
import type {
  VitrinCollectionCategoryOption,
  VitrinCollectionDetail,
  VitrinCollectionProductCard,
} from "@/lib/mirror-collections-sync";
import type { ResolvedMirrorCollectionTexts } from "@/lib/store-static-texts";
import type { CollectionFilterConfig } from "@/lib/collection-filter-settings";
import type {
  ActiveCollectionFilters,
  CollectionFilterFacets,
} from "@/lib/collection-filter-facets";

export type CollectionCatalogPayload = {
  collectionFromAdmin: VitrinCollectionDetail | null;
  productsFromAdmin: VitrinCollectionProductCard[];
  /** Tüm liste boyutu (ürünler yalnızca mevcut sayfa kadar gelir) */
  totalProductCount: number;
  categoriesFromAdmin: VitrinCollectionCategoryOption[];
  activeCategorySlug?: string;
  mirrorTexts: ResolvedMirrorCollectionTexts;
  paginationBasePath: string;
  title: string;
  filterFacets: CollectionFilterFacets;
  activeFilters: ActiveCollectionFilters;
  filterConfig: CollectionFilterConfig;
};

export type CollectionFramePayload = CollectionCatalogPayload & {
  branding: MirrorBranding;
  nav: MirrorNavItem[];
  footer: MirrorFooterData;
};
