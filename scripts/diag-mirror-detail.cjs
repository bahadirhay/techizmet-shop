const { chromium } = require("playwright");
const base = process.argv[2] || "http://localhost:5556";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("iframe.mirror-home-frame", { timeout: 60000 });
  await page.waitForTimeout(8000);

  const data = await page.evaluate(() => {
    const f = document.querySelector("iframe.mirror-home-frame");
    const d = f?.contentDocument;
    if (!d) return { error: "no doc" };
    return {
      parentBoot: !!document.getElementById("kn-mirror-parent-boot"),
      embedBoot: !!d.getElementById("kn-mirror-embed-boot"),
      scrollTop: !!d.querySelector("scroll-top,.scroll-to-top"),
      scrollTopHtml: d.querySelector("scroll-top")?.outerHTML?.slice(0, 200),
      streetBar: d.querySelector("#kn-street-food-bar")?.outerHTML?.slice(0, 120),
      galleryCount: d.querySelectorAll("[data-kn-gallery]").length,
      productCards: d.querySelectorAll(".collection--card-item,.product--card").length,
      mainContent: !!d.getElementById("MainContent"),
    };
  });

  const api = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/vitrin/street-food-fund", { credentials: "same-origin" });
      return { status: r.status, body: await r.json() };
    } catch (e) {
      return { error: String(e) };
    }
  });

  console.log(JSON.stringify({ data, api }, null, 2));
  await browser.close();
})();
