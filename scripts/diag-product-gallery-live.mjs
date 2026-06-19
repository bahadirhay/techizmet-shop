import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("https://www.anatolianpaw.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector("iframe.mirror-home-frame", { timeout: 30000 });
await page.waitForTimeout(15000);

const frame = page.frames().find((f) => f.url().includes("mirror"));
if (!frame) throw new Error("no frame");

const diag = await frame.evaluate(() => {
  const doc = document;
  const view = doc.defaultView;
  const media = doc.querySelector("[data-kn-gallery]");
  return {
    hasImageCtor: !!view && typeof view.Image === "function",
    catalogLive: doc.documentElement.getAttribute("data-kn-catalog-live"),
    fp: doc.documentElement.getAttribute("data-kn-home-catalog-fp")?.slice(0, 24),
    galleryCount: doc.querySelectorAll("[data-kn-gallery]").length,
    boundBefore: doc.querySelectorAll("[data-kn-gallery-bound='1']").length,
    mediaBound: media?.getAttribute("data-kn-gallery-bound") ?? null,
    urls: media ? JSON.parse(media.getAttribute("data-kn-gallery") || "[]").length : 0,
  };
});
console.log("diag", JSON.stringify(diag, null, 2));

// Manual bind like initProductCardGalleries
const hover = await frame.evaluate(() => {
  const doc = document;
  const view = doc.defaultView;
  if (!view || typeof view.Image !== "function") return { ok: false, reason: "no Image" };

  const media = doc.querySelector("[data-kn-gallery]");
  const img = media?.querySelector("img");
  if (!media || !img) return { ok: false, reason: "no media" };

  const urls = JSON.parse(media.getAttribute("data-kn-gallery") || "[]");
  let activeIndex = 0;
  const showIndex = (index) => {
    activeIndex = index;
    const next = urls[index];
    if (next) img.src = next;
  };
  media.addEventListener("pointermove", (event) => {
    const rect = media.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / Math.max(rect.width, 1);
    const idx = Math.min(urls.length - 1, Math.max(0, Math.floor(ratio * urls.length)));
    showIndex(idx);
  });

  const start = img.getAttribute("src") || "";
  const rect = media.getBoundingClientRect();
  const x = rect.left + rect.width * 0.85;
  media.dispatchEvent(
    new PointerEvent("pointermove", { bubbles: true, clientX: x, clientY: rect.top + 10, pointerId: 1, pointerType: "mouse" }),
  );
  const after = img.getAttribute("src") || "";
  return { ok: start !== after, start: start.split("/").pop(), after: after.split("/").pop(), urlCount: urls.length };
});

console.log("manual_hover", JSON.stringify(hover));
await browser.close();
