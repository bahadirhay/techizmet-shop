import type { Prisma } from "@prisma/client";
import type { StoreTextSettings } from "@/lib/store-static-texts";

export type HomeListingSort =
  | "manual"
  | "title_asc"
  | "title_desc"
  | "newest"
  | "oldest"
  | "price_asc"
  | "price_desc";

const DEFAULT_SORT: HomeListingSort = "manual";

export function resolveHomeListingSort(
  texts: StoreTextSettings | undefined,
): HomeListingSort {
  const sort = texts?.homeListingSort;
  if (
    sort === "manual" ||
    sort === "title_desc" ||
    sort === "newest" ||
    sort === "oldest" ||
    sort === "price_asc" ||
    sort === "price_desc" ||
    sort === "title_asc"
  ) {
    return sort;
  }
  return DEFAULT_SORT;
}

export function homeListingOrderBy(
  sort: HomeListingSort,
): Prisma.StoreProductOrderByWithRelationInput[] {
  switch (sort) {
    case "manual":
      return [{ sortOrder: "asc" }, { createdAt: "desc" }];
    case "title_desc":
      return [{ title: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "oldest":
      return [{ createdAt: "asc" }];
    case "price_asc":
      return [{ priceMinor: "asc" }];
    case "price_desc":
      return [{ priceMinor: "desc" }];
    case "title_asc":
      return [{ title: "asc" }];
    default:
      return [{ sortOrder: "asc" }, { createdAt: "desc" }];
  }
}
