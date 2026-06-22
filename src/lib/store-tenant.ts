import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { normalizeSiteUrl } from "@/lib/seo/site-url";
import { getRequestHost } from "@/lib/request-host";
import { getPrismaForDatabaseUrl } from "@/lib/prisma";
import {
  isDemoShopHost,
  isShopDemoDatabaseConfigured,
  normalizeRequestHost,
  resolveStoreHostTenant,
  STORE_HOST_TENANT,
  type StoreHostTenant,
} from "@/lib/store-tenant-hosts";
import { tenantStorage, type TenantContext } from "@/lib/tenant-context";

export type StoreTenant = TenantContext;

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

function tenantFromHostMapping(mapped: StoreHostTenant): StoreTenant {
  return {
    slug: mapped.slug,
    publicOrigin: mapped.publicOrigin,
    databaseUrl: databaseUrlFromEnv(mapped.databaseUrlEnv),
  };
}

/** Kozmetik DB — DATABASE_URL_DEMO önce, sonra DATABASE_URL içinde demo satırı */
async function tryResolveDemoTenant(publicOrigin: string): Promise<StoreTenant | null> {
  const candidates = [
    process.env.DATABASE_URL_DEMO?.trim(),
    process.env.DATABASE_URL?.trim(),
  ].filter((url, i, arr): url is string => Boolean(url) && arr.indexOf(url) === i);

  for (const databaseUrl of candidates) {
    try {
      const site = await getPrismaForDatabaseUrl(databaseUrl).storeSite.findUnique({
        where: { slug: "demo" },
        select: { slug: true },
      });
      if (site) {
        return { slug: "demo", publicOrigin, databaseUrl };
      }
    } catch {
      /* bağlantı / şema — sonraki adaya geç */
    }
  }
  return null;
}

async function tryResolveAnatolianPawTenant(publicOrigin: string): Promise<StoreTenant | null> {
  try {
    const databaseUrl = databaseUrlFromEnv("DATABASE_URL_ANATOLIANPAW");
    const site = await getPrismaForDatabaseUrl(databaseUrl).storeSite.findUnique({
      where: { slug: "anatolianpaw" },
      select: { slug: true },
    });
    if (!site) return null;
    return { slug: "anatolianpaw", publicOrigin, databaseUrl };
  } catch {
    return null;
  }
}

function resolveTenantFromEnv(): StoreTenant {
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

export function resolveTenantFromHost(host: string): StoreTenant {
  const mapped = resolveStoreHostTenant(host);
  if (!mapped) return resolveTenantFromEnv();
  if (mapped.slug === "demo") {
    return {
      slug: "demo",
      publicOrigin: mapped.publicOrigin,
      databaseUrl: databaseUrlFromEnv(mapped.databaseUrlEnv),
    };
  }
  return tenantFromHostMapping(mapped);
}

async function tenantFromProxyHeaders(): Promise<StoreTenant | null> {
  const h = await headers();
  const slug = h.get("x-store-tenant-slug")?.trim();
  const publicOrigin = h.get("x-store-public-origin")?.trim();
  const databaseUrlEnv = h.get("x-store-database-url-env")?.trim();
  if (!slug || !publicOrigin) return null;

  // Proxy host eşlemesi güvenilir — her istekte DB doğrulaması yapma
  if (databaseUrlEnv || slug === "anatolianpaw" || slug === "demo") {
    return {
      slug,
      publicOrigin,
      databaseUrl: databaseUrlFromEnv(
        databaseUrlEnv ||
          (slug === "anatolianpaw"
            ? "DATABASE_URL_ANATOLIANPAW"
            : slug === "demo"
              ? "DATABASE_URL_DEMO"
              : undefined),
      ),
    };
  }

  if (slug === "demo") {
    const resolved = await tryResolveDemoTenant(publicOrigin);
    if (resolved) return resolved;
    return null;
  }

  if (slug === "anatolianpaw") {
    const resolved = await tryResolveAnatolianPawTenant(publicOrigin);
    if (resolved) return resolved;
    return null;
  }

  return {
    slug,
    publicOrigin,
    databaseUrl: databaseUrlFromEnv(databaseUrlEnv || undefined),
  };
}

async function tenantFromRequestHost(host: string): Promise<StoreTenant | null> {
  const mapped = resolveStoreHostTenant(host);
  if (!mapped) return null;

  if (mapped.slug === "demo") {
    return tryResolveDemoTenant(mapped.publicOrigin);
  }

  if (mapped.slug === "anatolianpaw") {
    return tryResolveAnatolianPawTenant(mapped.publicOrigin);
  }

  return tenantFromHostMapping(mapped);
}

export function getActiveTenant(): StoreTenant | undefined {
  return tenantStorage.getStore();
}

/** İstek başına tenant — prisma ve site metadata bunu kullanır */
export const ensureStoreTenant = cache(async (): Promise<StoreTenant> => {
  const existing = tenantStorage.getStore();
  if (existing) return existing;

  const fromProxy = await tenantFromProxyHeaders();
  if (fromProxy) {
    tenantStorage.enterWith(fromProxy);
    return fromProxy;
  }

  const host = await getRequestHost();
  const fromHost = await tenantFromRequestHost(host);
  if (fromHost) {
    tenantStorage.enterWith(fromHost);
    return fromHost;
  }

  const tenant = resolveTenantFromEnv();
  tenantStorage.enterWith(tenant);
  return tenant;
});

export { getActivePublicOrigin, getActiveDatabaseUrl, getActiveTenantSlug } from "@/lib/tenant-context";
export { STORE_HOST_TENANT, isDemoShopHost, isShopDemoDatabaseConfigured, normalizeRequestHost };
