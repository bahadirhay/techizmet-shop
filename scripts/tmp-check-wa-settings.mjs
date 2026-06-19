import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const s = await p.storeSite.findFirst({ where: { slug: "anatolianpaw" } });
  if (!s) {
    console.log("site not found");
    return;
  }
  const j = JSON.parse(s.settingsJson || "{}");
  console.log("legal phone:", j.store?.legal?.phone || "(empty)");
  console.log("shipFrom phone:", j.store?.shipFrom?.phone || "(empty)");
  console.log("whatsapp settings:", JSON.stringify(j.whatsapp || {}, null, 2));
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
