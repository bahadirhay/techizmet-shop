import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
for (const viewport of [{ width: 1280, height: 900, label: "desktop" }, { width: 390, height: 844, label: "mobile" }]) {
  const page = await browser.newPage({ viewport });
await page.goto("https://www.anatolianpaw.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector("iframe.mirror-home-frame", { timeout: 30000 });
await page.waitForTimeout(6000);

const frame = page.frames().find((f) => f.url().includes("mirror"));
if (!frame) {
  console.log("FAIL: no mirror iframe");
  await browser.close();
  process.exit(1);
}

const result = await frame.evaluate(() => {
  const img = document.querySelector(".section-media-grid img.media_image");
  const section = document.querySelector(".section-media-grid");
  const wrapper = section?.querySelector(".media-grid--wrapper");
  const imgRect = img?.getBoundingClientRect();
  return {
    embed: document.documentElement.classList.contains("kn-mirror-embed"),
    criticalCss: !!document.getElementById("kn-mirror-embed-critical"),
    heroCssV: document.getElementById("kn-mirror-hero-css")?.getAttribute("href") ?? null,
    desktopHeight: wrapper ? getComputedStyle(wrapper).getPropertyValue("--desktop_height").trim() : null,
    imgHeight: imgRect?.height ?? 0,
    sectionHeight: section?.getBoundingClientRect().height ?? 0,
    imgComplete: img instanceof HTMLImageElement ? img.complete && img.naturalWidth > 0 : false,
  };
});

const ok =
  result.embed &&
  result.criticalCss &&
  result.imgHeight > 100 &&
  result.imgHeight < 2000 &&
  result.sectionHeight < 3000 &&
  result.imgComplete;

console.log(viewport.label, JSON.stringify({ ok, ...result }));
if (!ok) {
  await browser.close();
  process.exit(1);
}
}

await browser.close();
process.exit(0);
