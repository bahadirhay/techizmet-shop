import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("https://www.anatolianpaw.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector("iframe.mirror-home-frame", { timeout: 30000 });
await page.waitForTimeout(10000);

const frame = page.frames().find((f) => f.url().includes("mirror"));
if (!frame) throw new Error("no mirror frame");

const info = await frame.evaluate(() => {
  const html = document.documentElement;
  const body = document.body;
  const htmlStyle = getComputedStyle(html);
  const bodyStyle = getComputedStyle(body);
  return {
    embed: html.classList.contains("kn-mirror-embed"),
    htmlOverflowY: htmlStyle.overflowY,
    bodyOverflowY: bodyStyle.overflowY,
    scrollLockStyle: !!document.getElementById("kn-mirror-visible-fallback")?.textContent?.includes("overflow-y: hidden"),
    docHeight: Math.max(html.scrollHeight, body.scrollHeight),
  };
});

const parent = await page.evaluate(() => ({
  bodyOverflowY: getComputedStyle(document.body).overflowY,
  docHeight: document.documentElement.scrollHeight,
}));

const iframeBox = await page.locator("iframe.mirror-home-frame").evaluate((el) => ({
  height: el.style.height || getComputedStyle(el).height,
  overflow: getComputedStyle(el).overflow,
}));

console.log(JSON.stringify({ frame: info, parent, iframeBox }, null, 2));
await browser.close();
