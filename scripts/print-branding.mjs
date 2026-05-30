import { prisma } from "../src/lib/prisma.ts";
import { parseSiteSettings, getSiteBranding } from "../src/lib/site-settings.ts";

const site = await prisma.storeSite.findFirst();
const settings = parseSiteSettings(site?.settingsJson);
console.log("raw branding:", settings.branding);
console.log("resolved:", getSiteBranding(settings));
await prisma.$disconnect();
