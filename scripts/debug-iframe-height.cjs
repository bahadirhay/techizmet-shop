const { chromium } = require("playwright");

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(process.argv[2] || "http://localhost:5556", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await p.waitForTimeout(15000);
  const info = await p.evaluate(() => {
    const f = document.querySelector("iframe.mirror-home-frame");
    const d = f?.contentDocument;
    if (!d) return { err: "no doc" };
    return {
      iframeStyle: f.style.height,
      iframeOffset: f.offsetHeight,
      bridge: d.documentElement.getAttribute("data-kn-scroll-bridge"),
      embed: d.documentElement.classList.contains("kn-mirror-embed"),
      stability: !!d.getElementById("kn-scroll-stability-style"),
      uiFix: !!d.querySelector('link[href*="store-ui-fixes"]'),
      parentSh: document.documentElement.scrollHeight,
    };
  });
  console.log(info);
  await b.close();
})();
