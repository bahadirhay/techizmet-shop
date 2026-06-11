import { config } from "dotenv";
import { resolve } from "node:path";
import { parseHTML } from "linkedom";

config({ path: resolve(".env.anatolianpaw") });

import { PrismaClient } from "@prisma/client";
import { buildMirrorHtmlCore } from "../src/lib/mirror-html-processor";
import { getMirrorPageConfig } from "../src/lib/mirror-page-settings";
import { getSiteSettingsUncached } from "../src/lib/site-settings-load";

const TREND = "trending_products_PyF3GL";

function sectionKeysInMain(html: string): string[] {
  const main = parseHTML(html).document.getElementById("MainContent");
  if (!main) return [];
  return [...main.querySelectorAll(":scope > section.kn-mirror-section")]
    .map((el) => el.id?.match(/__([a-zA-Z0-9_]+)$/)?.[1] ?? "")
    .filter(Boolean);
}

async function main() {
  const p = new PrismaClient();
  const site = await p.storeSite.findUnique({ where: { slug: "anatolianpaw" } });
  if (!site) throw new Error("site not found");

  const settings = await getSiteSettingsUncached(site.id);
  const baseOrder = getMirrorPageConfig(settings, "home").order;
  const swapped = baseOrder.filter((k) => k !== TREND);
  swapped.unshift(TREND);

  const html = await buildMirrorHtmlCore({
    normalized: "theme/techizmet-shop/mirror/index-tr.html",
    locale: "tr",
    siteId: site.id,
    siteName: site.name,
    pageKey: "home",
    layoutOrder: swapped,
  });

  const keys = sectionKeysInMain(html);
  console.log("sections in MainContent:", keys.length);
  console.log("first key:", keys[0]);
  console.log("expected:", TREND);
  console.log("order ok:", keys[0] === TREND);
  console.log("trend index:", keys.indexOf(TREND));

  await p.$disconnect();
  if (keys[0] !== TREND) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
