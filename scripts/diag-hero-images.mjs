import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("https://www.anatolianpaw.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector("iframe.mirror-home-frame", { timeout: 30000 });
await page.waitForTimeout(5000);

const frame = page.frames().find((f) => f.url().includes("mirror"));
if (!frame) {
  console.log("NO_MIRROR_IFRAME");
  await browser.close();
  process.exit(1);
}

async function snapshot(label) {
  const iframeHeight = await page.evaluate(() => {
    const el = document.querySelector("iframe.mirror-home-frame");
    return el ? { styleH: el.style.height, offsetH: el.offsetHeight } : null;
  });
  const info = await frame.evaluate(() => {
    const img = document.querySelector(".section-media-grid img.media_image");
    const section = document.querySelector(".section-media-grid");
    const wrapper = section?.querySelector(".media-grid--wrapper");
    const cs = (el) => (el ? getComputedStyle(el).height : null);
    return {
      embed: document.documentElement.classList.contains("kn-mirror-embed"),
      desktopHeight: wrapper ? getComputedStyle(wrapper).getPropertyValue("--desktop_height") : null,
      sectionH: cs(section),
      imgH: cs(img),
      imgRectH: img?.getBoundingClientRect().height ?? null,
    };
  });
  console.log(label, JSON.stringify({ iframeHeight, info }));
}

await snapshot("BEFORE_FIX");
await frame.evaluate(() => {
  document.documentElement.classList.add("kn-mirror-embed");
  const css = `html.kn-mirror-embed #MainContent > .section-media-grid:first-of-type{--desktop_height:300px!important;--mobile_height:200px!important;}
html.kn-mirror-embed .section-media-grid:first-of-type img.media_image{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;}`;
  let style = document.getElementById("kn-mirror-embed-critical");
  if (!style) {
    style = document.createElement("style");
    style.id = "kn-mirror-embed-critical";
    document.head.appendChild(style);
  }
  style.textContent = css;
});
await page.waitForTimeout(300);
await snapshot("AFTER_FIX");
await browser.close();
