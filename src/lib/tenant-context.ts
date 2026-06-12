import { AsyncLocalStorage } from "node:async_hooks";

export type TenantContext = {
  slug: string;
  databaseUrl: string;
  publicOrigin: string;
};

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getActivePublicOrigin(): string | undefined {
  return tenantStorage.getStore()?.publicOrigin;
}

export function getActiveDatabaseUrl(): string | undefined {
  return tenantStorage.getStore()?.databaseUrl;
}

export function getActiveTenantSlug(): string | undefined {
  return tenantStorage.getStore()?.slug;
}
