/**
 * Admin'den yüklenen PNG logoları DB'ye geri yazar (seed script ezmişse).
 */
import { prisma } from "../src/lib/prisma.ts";
import { mergeSiteSettings } from "../src/lib/merge-site-settings.ts";
import { parseSiteSettings } from "../src/lib/site-settings.ts";

const DARK = "/uploads/shop/cmpgkh1vm0000uiignkqo8dfw/1779556631043-366e5ccb9c594d96.png";
const LIGHT = "/uploads/shop/cmpgkh1vm0000uiignkqo8dfw/1779556663629-6c69a28d4df336d5.png";

const site = await prisma.storeSite.findFirst({ orderBy: { createdAt: "asc" } });
if (!site) throw new Error("Site yok");

const settings = mergeSiteSettings(parseSiteSettings(site.settingsJson), {
  branding: { logoUrl: DARK, logoUrlLight: LIGHT, faviconUrl: "/favicon.ico" },
});

await prisma.storeSite.update({
  where: { id: site.id },
  data: { settingsJson: JSON.stringify(settings) },
});

console.log("Logo DB geri yüklendi:");
console.log("  logoUrl:", DARK);
console.log("  logoUrlLight:", LIGHT);
await prisma.$disconnect();
