import { Prisma, PrismaClient } from "@prisma/client";

/** Şemaya model eklendiğinde artırın — dev HMR eski client’ı atar */
const PRISMA_SCHEMA_VERSION = 5;

type GlobalPrisma = {
  prisma?: PrismaClient;
  prismaSchemaVersion?: number;
};

const globalForPrisma = globalThis as unknown as GlobalPrisma;

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
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

function resolveClient(): PrismaClient {
  const versionOk = globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION;
  const cached = globalForPrisma.prisma;

  if (cached && versionOk && prismaClientReady(cached)) {
    return cached;
  }

  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaSchemaVersion = undefined;

  const client = createClient();
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

  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;

  return client;
}

/**
 * HMR sırasında modül yeniden yüklense bile her erişimde güncel client.
 * `export const prisma = getClient()` tek seferlik eski örneği tutuyordu.
 */
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
