/**
 * Mirror scroll köprüsü testi (playwright gerekir: npx -y -p playwright node scripts/test-mirror-scroll-bridge.cjs [url])
 */
const { chromium } = require("playwright");

const base = process.argv[2] || "http://localhost:5556";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];

  try {
    await page.goto(base, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(3000);

    const iframe = page.frameLocator("iframe.mirror-home-frame").first();
    await iframe.locator("#MainContent").waitFor({ timeout: 60000 });

    const before = await iframe.locator(".scroll-to-top").first().evaluate((el) => ({
      hasShow: el.classList.contains("show"),
      opacity: getComputedStyle(el).opacity,
    }));

    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(1000);

    const afterScroll = await iframe.locator(".scroll-to-top").first().evaluate((el) => ({
      hasShow: el.classList.contains("show"),
      opacity: getComputedStyle(el).opacity,
    }));

    const headerSticky = await iframe
      .locator("sticky-always.header, sticky-on-scroll.header")
      .first()
      .evaluate((el) => el.classList.contains("is-sticky"));

    const headerPinned = await iframe.locator("header.section-header").first().evaluate((el) => ({
      pinned: el.classList.contains("kn-mirror-header-pinned"),
      transform: el.style.transform,
      top: el.getBoundingClientRect().top,
    }));

    console.log("URL:", base);
    console.log("scroll-top before:", before);
    console.log("scroll-top after 900px:", afterScroll);
    console.log("header is-sticky:", headerSticky);
    console.log("header pinned:", headerPinned);

    if (before.hasShow) errors.push("scroll-top visible at top");
    if (!afterScroll.hasShow) errors.push("scroll-top missing after scroll");
    if (parseFloat(afterScroll.opacity) < 0.5) errors.push("scroll-top low opacity");
    if (!headerSticky) errors.push("header not sticky");
    if (headerPinned.top < -10 && !headerPinned.pinned) errors.push("header not pinned");

    if (errors.length) {
      console.error("FAIL:", errors.join("; "));
      process.exitCode = 1;
    } else {
      console.log("PASS");
    }
  } catch (err) {
    console.error("TEST ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
