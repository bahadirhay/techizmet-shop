/** Edge proxy + sunucu — host → mağaza (server-only / Prisma yok) */

export type StoreHostTenant = {
  slug: string;
  publicOrigin: string;
  databaseUrlEnv?: string;
};

export const STORE_HOST_TENANT: Record<string, StoreHostTenant> = {
  "shop.techizmet.com": {
    slug: "demo",
    publicOrigin: "https://shop.techizmet.com",
    databaseUrlEnv: "DATABASE_URL_DEMO",
  },
  "www.shop.techizmet.com": {
    slug: "demo",
    publicOrigin: "https://shop.techizmet.com",
    databaseUrlEnv: "DATABASE_URL_DEMO",
  },
  "anatolianpaw.com": {
    slug: "anatolianpaw",
    publicOrigin: "https://www.anatolianpaw.com",
    databaseUrlEnv: "DATABASE_URL_ANATOLIANPAW",
  },
  "www.anatolianpaw.com": {
    slug: "anatolianpaw",
    publicOrigin: "https://www.anatolianpaw.com",
    databaseUrlEnv: "DATABASE_URL_ANATOLIANPAW",
  },
};

export function normalizeRequestHost(host: string): string {
  return host.toLowerCase().split(":")[0]?.trim() ?? "";
}

export function resolveStoreHostTenant(host: string): StoreHostTenant | undefined {
  return STORE_HOST_TENANT[normalizeRequestHost(host)];
}

export function isDemoShopHost(host: string): boolean {
  const slug = resolveStoreHostTenant(host)?.slug;
  return slug === "demo";
}

/** shop.techizmet.com kozmetik DB — Vercel'de DATABASE_URL_DEMO */
export function isShopDemoDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL_DEMO?.trim());
}
