const { chromium } = require("playwright");

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  p.on("console", (m) => console.log("console:", m.type(), m.text()));
  p.on("pageerror", (e) => console.log("pageerror:", e.message));
  await p.goto(process.argv[2] || "http://localhost:5556", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await p.waitForTimeout(8000);
  await b.close();
})();
