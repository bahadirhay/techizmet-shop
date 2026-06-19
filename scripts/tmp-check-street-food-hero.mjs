import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("https://www.anatolianpaw.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector("iframe.mirror-home-frame", { timeout: 30000 });
await page.waitForTimeout(12000);

const frame = page.frames().find((f) => f.url().includes("mirror"));
if (!frame) throw new Error("no mirror frame");

const info = await frame.evaluate(() => ({
  bar: !!document.getElementById("kn-street-food-bar"),
  hero: !!document.getElementById("kn-street-food-hero"),
  heroTitle: document.querySelector("#kn-street-food-hero .kn-street-food-hero__title")?.textContent?.trim() ?? null,
  barHidden: document.getElementById("kn-street-food-bar")?.hasAttribute("hidden") ?? null,
}));

console.log(JSON.stringify(info, null, 2));
await browser.close();
