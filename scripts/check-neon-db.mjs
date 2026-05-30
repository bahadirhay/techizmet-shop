import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL yok (.env)");
  process.exit(1);
}

const hostMatch = url.match(/@([^/]+)\/([^?]+)/);
console.log("Host:", hostMatch?.[1] ?? "?");
console.log("Database:", hostMatch?.[2] ?? "?");

const prisma = new PrismaClient();

try {
  const schemas = await prisma.$queryRaw`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name IN ('shop','public') ORDER BY 1
  `;
  console.log(
    "Schemas:",
    schemas.map((r) => r.schema_name).join(", ") || "(yok)",
  );

  const tables = await prisma.$queryRaw`
    SELECT table_schema, table_name FROM information_schema.tables
    WHERE table_schema = 'shop' ORDER BY table_name LIMIT 15
  `;
  console.log("shop tabloları (ilk 15):", tables.length);
  for (const r of tables) console.log(" -", `${r.table_schema}.${r.table_name}`);

  const site = await prisma.storeSite.findUnique({ where: { slug: "demo" } });
  console.log("Prisma demo site:", site ? `${site.slug} / ${site.name}` : "(yok)");
} catch (e) {
  console.error("Hata:", e instanceof Error ? e.message : e);
} finally {
  await prisma.$disconnect();
}
