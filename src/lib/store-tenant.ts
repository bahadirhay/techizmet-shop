import "server-only";

import { cache } from "react";
import { normalizeSiteUrl } from "@/lib/seo/site-url";
import { getRequestHost } from "@/lib/request-host";
import { tenantStorage, type TenantContext } from "@/lib/tenant-context";

export type StoreTenant = TenantContext;

/** Host → mağaza. shop.techizmet.com her zaman kozmetik (demo). */
const HOST_TENANT: Record<
  string,
  { slug: string; publicOrigin: string; databaseUrlEnv?: string }
> = {
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

function databaseUrlFromEnv(envKey?: string): string {
  if (envKey) {
    const dedicated = process.env[envKey]?.trim();
    if (dedicated) return dedicated;
  }
  const fallback = process.env.DATABASE_URL?.trim();
  if (!fallback) {
    throw new Error("DATABASE_URL eksik — Vercel ortam değişkenlerini kontrol edin.");
  }
  return fallback;
}

export function resolveTenantFromHost(host: string): StoreTenant {
  const key = host.toLowerCase().split(":")[0];
  const mapped = HOST_TENANT[key];
  if (mapped) {
    return {
      slug: mapped.slug,
      publicOrigin: mapped.publicOrigin,
      databaseUrl: databaseUrlFromEnv(mapped.databaseUrlEnv),
    };
  }

  const slug = process.env.STORE_SITE_SLUG?.trim() || "demo";
  const publicOrigin = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.NEXT_PUBLIC_STORE_URL?.trim() ||
      "http://localhost:5555",
  );
  return {
    slug,
    publicOrigin,
    databaseUrl: databaseUrlFromEnv(
      slug === "anatolianpaw" ? "DATABASE_URL_ANATOLIANPAW" : "DATABASE_URL_DEMO",
    ),
  };
}

export function getActiveTenant(): StoreTenant | undefined {
  return tenantStorage.getStore();
}

/** İstek başına tenant — prisma ve site metadata bunu kullanır */
export const ensureStoreTenant = cache(async (): Promise<StoreTenant> => {
  const existing = tenantStorage.getStore();
  if (existing) return existing;

  const host = await getRequestHost();
  const tenant = resolveTenantFromHost(host);
  tenantStorage.enterWith(tenant);
  return tenant;
});

export { getActivePublicOrigin, getActiveDatabaseUrl, getActiveTenantSlug } from "@/lib/tenant-context";
