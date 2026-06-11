import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(".env") });

const prisma = new PrismaClient();

const { getMirrorPageConfig } = await import("../src/lib/mirror-page-settings.ts");
const { applyMirrorPageOverlayToHtml } = await import("../src/lib/mirror-page-overlay-server.ts");
const { hasMirrorPageEdits } = await import("../src/lib/mirror-has-page-edits.ts");

const site = await prisma.storeSite.findUnique({ where: { slug: "anatolianpaw" } });
const settings = JSON.parse(site.settingsJson || "{}");
const pageConfig = getMirrorPageConfig(settings, "home");
console.log("hasEdits", hasMirrorPageEdits(pageConfig));
console.log("order has grid", pageConfig.order?.includes("media_grid_bGXVTf"));
console.log("grid items", pageConfig.sections?.media_grid_bGXVTf?.mediaGridItems?.length);

const html = readFileSync(
  resolve("public/theme/techizmet-shop/mirror/index-tr.html"),
  "utf8",
);
const out = applyMirrorPageOverlayToHtml(html, pageConfig, "tr");
console.log("contains paw hero", out.includes("anatolianpaw-hero-1"));
console.log("contains uploads", out.includes("/uploads/shop/"));

await prisma.$disconnect();
