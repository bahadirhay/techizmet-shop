import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { normalizeSiteUrl } from "@/lib/seo/site-url";
import { getRequestHost } from "@/lib/request-host";
import {
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

export function resolveTenantFromHost(host: string): StoreTenant {
  const mapped = resolveStoreHostTenant(host);
  if (mapped) return tenantFromHostMapping(mapped);

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

async function tenantFromProxyHeaders(): Promise<StoreTenant | null> {
  const h = await headers();
  const slug = h.get("x-store-tenant-slug")?.trim();
  const publicOrigin = h.get("x-store-public-origin")?.trim();
  const databaseUrlEnv = h.get("x-store-database-url-env")?.trim();
  if (!slug || !publicOrigin) return null;

  return {
    slug,
    publicOrigin,
    databaseUrl: databaseUrlFromEnv(databaseUrlEnv || undefined),
  };
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
  const mapped = resolveStoreHostTenant(host);
  if (mapped) {
    const tenant = tenantFromHostMapping(mapped);
    tenantStorage.enterWith(tenant);
    return tenant;
  }

  const tenant = resolveTenantFromHost(host);
  tenantStorage.enterWith(tenant);
  return tenant;
});

export { getActivePublicOrigin, getActiveDatabaseUrl, getActiveTenantSlug } from "@/lib/tenant-context";
export { STORE_HOST_TENANT };
