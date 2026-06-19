import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const rows = await p.storeInstagramPost.findMany({ take: 1 });
  console.log("store_instagram_post ok, rows:", rows.length);
} catch (e) {
  console.error("store_instagram_post error:", e.message);
}
await p.$disconnect();
