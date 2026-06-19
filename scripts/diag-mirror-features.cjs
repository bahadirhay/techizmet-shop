/** Yerel mirror özellik testi — iframe içi kaydırma */
const { chromium } = require("playwright");

const base = process.argv[2] || "http://localhost:5556";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector("iframe.mirror-home-frame", { timeout: 60000 });
    await page.waitForTimeout(4000);

    const shell = await page.evaluate(() => {
      const f = document.querySelector("iframe.mirror-home-frame");
      return {
        parentScrollH: document.documentElement.scrollHeight,
        parentScrollY: window.scrollY,
        iframeH: f?.style.height,
        iframeRectH: f?.getBoundingClientRect().height,
      };
    });

    const frame = page.frameLocator("iframe.mirror-home-frame").first();
    await frame.locator("#MainContent").waitFor({ timeout: 30000 });

    const before = await frame.locator("body").evaluate((body) => ({
      iframeScrollH: body.ownerDocument.documentElement.scrollHeight,
      iframeScrollY: body.ownerDocument.documentElement.scrollTop,
      scrollTopVisible: (() => {
        const el = body.querySelector(".scroll-to-top");
        if (!el) return null;
        return {
          hasShow: el.classList.contains("show"),
          opacity: getComputedStyle(el).opacity,
        };
      })(),
      streetBar: !!body.querySelector("#kn-street-food-bar:not([hidden])"),
      galleryCount: body.querySelectorAll("[data-kn-gallery]").length,
      galleryBound: body.querySelectorAll("[data-kn-gallery-bound]").length,
      headerSticky: !!body.querySelector("sticky-always.is-sticky, sticky-on-scroll.is-sticky"),
    }));

    await frame.locator("body").evaluate(() => {
      window.scrollTo(0, 600);
    });
    await page.waitForTimeout(800);

    const after = await frame.locator("body").evaluate((body) => ({
      iframeScrollY: body.ownerDocument.documentElement.scrollTop,
      scrollTopVisible: (() => {
        const el = body.querySelector(".scroll-to-top");
        if (!el) return null;
        return {
          hasShow: el.classList.contains("show"),
          opacity: getComputedStyle(el).opacity,
        };
      })(),
      headerSticky: !!body.querySelector("sticky-always.is-sticky, sticky-on-scroll.is-sticky"),
      headerTop: body.querySelector("header.section-header")?.getBoundingClientRect().top,
    }));

    console.log(JSON.stringify({ shell, before, after }, null, 2));
  } catch (err) {
    console.error("ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
