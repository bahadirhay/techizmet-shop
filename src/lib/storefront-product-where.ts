/**
 * Web vitrininde listelenen ürünler: yayında + sitede görünür.
 * Pazaryeri sync yalnızca `published` kullanır (storeVisible=false olsa da gider).
 */
export const storefrontListedWhere = {
  published: true,
  storeVisible: true,
} as const;

export type StorefrontListedWhere = typeof storefrontListedWhere;
