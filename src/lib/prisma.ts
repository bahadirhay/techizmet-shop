import { Prisma, PrismaClient } from "@prisma/client";
import { getActiveDatabaseUrl } from "@/lib/tenant-context";

/** Şemaya model eklendiğinde artırın — dev HMR eski client’ı atar */
const PRISMA_SCHEMA_VERSION = 7;

type GlobalPrisma = {
  prismaClients?: Map<string, PrismaClient>;
  prismaSchemaVersion?: number;
};

const globalForPrisma = globalThis as unknown as GlobalPrisma;

function defaultDatabaseUrl(): string {
  return (
    getActiveDatabaseUrl() ||
    process.env.DATABASE_URL?.trim() ||
    (() => {
      throw new Error("DATABASE_URL eksik");
    })()
  );
}

function clientMap(): Map<string, PrismaClient> {
  if (!globalForPrisma.prismaClients) {
    globalForPrisma.prismaClients = new Map();
  }
  return globalForPrisma.prismaClients;
}

function isPgConnectionClosed(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /Closed|ECONNRESET|Connection terminated|connection.*not open|Can't reach database|Connection reset|P1001|P1017/i.test(
    msg,
  );
}

function invalidateCachedClient(databaseUrl: string) {
  const map = clientMap();
  const cached = map.get(databaseUrl);
  map.delete(databaseUrl);
  void cached?.$disconnect().catch(() => undefined);
}

type QueryContext = {
  model: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
};

async function runWithReconnect(databaseUrl: string, ctx: QueryContext): Promise<unknown> {
  try {
    return await ctx.query(ctx.args);
  } catch (error) {
    if (!isPgConnectionClosed(error)) throw error;

    invalidateCachedClient(databaseUrl);
    const fresh = resolveClient(databaseUrl);
    await fresh.$connect().catch(() => undefined);

    const delegate = (fresh as unknown as Record<string, Record<string, unknown>>)[ctx.model];
    const fn = delegate?.[ctx.operation];
    if (typeof fn === "function") {
      return (fn as (args: unknown) => Promise<unknown>).call(delegate, ctx.args);
    }

    throw error;
  }
}

function createClient(databaseUrl: string): PrismaClient {
  const client = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return client.$extends({
    query: {
      $allOperations(ctx) {
        return runWithReconnect(databaseUrl, {
          model: ctx.model ?? "",
          operation: ctx.operation,
          args: ctx.args,
          query: ctx.query,
        });
      },
    },
  }) as unknown as PrismaClient;
}

function navMenuSupportsLinkFields(): boolean {
  return "linkType" in Prisma.NavMenuItemScalarFieldEnum;
}

function hasNavMenuDelegate(client: PrismaClient): boolean {
  const c = client as PrismaClient & { navMenuItem?: { findMany?: unknown } };
  return typeof c.navMenuItem?.findMany === "function" && navMenuSupportsLinkFields();
}

function hasStoreBlogPostDelegate(client: PrismaClient): boolean {
  const c = client as PrismaClient & { storeBlogPost?: { findMany?: unknown } };
  return typeof c.storeBlogPost?.findMany === "function";
}

function prismaClientReady(client: PrismaClient): boolean {
  return hasNavMenuDelegate(client) && hasStoreBlogPostDelegate(client);
}

function resolveClient(databaseUrl = defaultDatabaseUrl()): PrismaClient {
  const versionOk = globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION;
  const map = clientMap();
  const cached = map.get(databaseUrl);

  if (cached && versionOk && prismaClientReady(cached)) {
    return cached;
  }

  if (cached) {
    invalidateCachedClient(databaseUrl);
  }

  if (globalForPrisma.prismaSchemaVersion !== PRISMA_SCHEMA_VERSION) {
    for (const url of [...map.keys()]) {
      invalidateCachedClient(url);
    }
    globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  }

  const client = createClient(databaseUrl);
  if (!prismaClientReady(client)) {
    const hint = !hasStoreBlogPostDelegate(client)
      ? "storeBlogPost delegate eksik (blog modeli)"
      : navMenuSupportsLinkFields()
        ? "navMenuItem delegate eksik"
        : "NavMenuItem.linkType eksik (eski Prisma client)";
    throw new Error(
      `Prisma Client güncel değil (${hint}). Dev sunucusunu durdurun, sonra: npx prisma generate — ardından .next klasörünü silin ve npm run dev`,
    );
  }

  map.set(databaseUrl, client);
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  void client.$connect().catch(() => undefined);

  return client;
}

/**
 * HMR sırasında modül yeniden yüklense bile her erişimde güncel client.
 * `export const prisma = getClient()` tek seferlik eski örneği tutuyordu.
 */
export function getPrismaForDatabaseUrl(databaseUrl?: string): PrismaClient {
  return resolveClient(databaseUrl?.trim() || defaultDatabaseUrl());
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = resolveClient();
    const value = Reflect.get(client as object, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
