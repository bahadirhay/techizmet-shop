import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import type { MirrorNavItem } from "@/lib/mirror-nav-overlay";
import type {
  VitrinCollectionCategoryOption,
  VitrinCollectionDetail,
  VitrinCollectionProductCard,
} from "@/lib/mirror-collections-sync";
import type { ResolvedMirrorCollectionTexts } from "@/lib/store-static-texts";

export type CollectionCatalogPayload = {
  collectionFromAdmin: VitrinCollectionDetail | null;
  productsFromAdmin: VitrinCollectionProductCard[];
  categoriesFromAdmin: VitrinCollectionCategoryOption[];
  activeCategorySlug?: string;
  mirrorTexts: ResolvedMirrorCollectionTexts;
  paginationBasePath: string;
  title: string;
};

export type CollectionFramePayload = CollectionCatalogPayload & {
  branding: MirrorBranding;
  nav: MirrorNavItem[];
  footer: MirrorFooterData;
};
