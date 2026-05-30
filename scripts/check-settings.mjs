import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
const prisma = new PrismaClient();
const site = await prisma.storeSite.findUnique({ where: { slug: "demo" } });
const settings = JSON.parse(site?.settingsJson || "{}");
console.log("homepageMode:", settings.theme?.homepageMode);
console.log("mirrorHome keys:", Object.keys(settings.theme?.mirrorHome || {}));
console.log("mirrorPages keys:", Object.keys(settings.theme?.mirrorPages || {}));
console.log("branding:", settings.branding);
const blogs = await prisma.storeBlogPost.count({ where: { siteId: site.id, featuredOnHome: true } });
const nav = await prisma.navMenuItem.count({ where: { siteId: site.id } });
console.log("featured blogs:", blogs, "nav items:", nav);
await prisma.$disconnect();
