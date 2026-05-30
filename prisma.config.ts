import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

/** generate için gerçek bağlantı gerekmez; Vercel postinstall DATABASE_URL olmadan da çalışsın */
const datasourceUrl =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=shop";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { seed: "tsx prisma/seed.ts" },
  datasource: { url: datasourceUrl },
});
