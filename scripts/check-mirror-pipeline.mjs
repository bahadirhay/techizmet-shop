import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = process.cwd();
const rel = "theme/techizmet-shop/mirror/index-tr.html";
let html = readFileSync(join(root, "public", rel), "utf8");

const steps = [];

async function run() {
  const { sanitizeLegacyStoreMirrorHtml, patchMirrorFormAutocomplete } = await import(
    "../src/lib/mirror-html-shopify-strip.ts",
  );
  const { localizeMirrorHtml } = await import("../src/lib/mirror-html-locale.ts");
  const { injectBrandingIntoMirrorHtml } = await import("../src/lib/mirror-html-branding.ts");
  const { fixMirrorCdnPathsInHtml } = await import("../src/lib/mirror-cdn-assets.ts");
  const { injectMirrorSearchBridge } = await import("../src/lib/mirror-search-bridge.ts");
  const { injectMirrorLinkBridge } = await import("../src/lib/mirror-link-bridge.ts");
  const { injectMirrorCartBridge } = await import("../src/lib/mirror-cart-bridge.ts");
  const { injectMirrorQuickviewBridge } = await import("../src/lib/mirror-quickview-bridge.ts");
  const { injectMirrorIconsFix } = await import("../src/lib/mirror-icons-fix.ts");
  const { injectMirrorAccountBridge } = await import("../src/lib/mirror-account-bridge.ts");

  const branding = { logoUrl: "/x.png", logoUrlLight: "/x.png", faviconUrl: "/f.ico" };

  const pipeline = [
    ["sanitizeLegacy", () => sanitizeLegacyStoreMirrorHtml(html)],
    ["cdn", (h) => fixMirrorCdnPathsInHtml(h)],
    ["brand", (h) => injectBrandingIntoMirrorHtml(h, branding)],
    ["locale", (h) => localizeMirrorHtml(h, rel, "tr")],
    ["autocomplete", (h) => patchMirrorFormAutocomplete(h)],
    ["accountBridge", (h) => injectMirrorAccountBridge(h)],
    ["cartBridge", (h) => injectMirrorCartBridge(h)],
    ["linkBridge", (h) => injectMirrorLinkBridge(h)],
    ["searchBridge", (h) => injectMirrorSearchBridge(h)],
    ["quickviewBridge", (h) => injectMirrorQuickviewBridge(h)],
    ["iconsFix", (h) => injectMirrorIconsFix(h)],
  ];

  for (const [name, fn] of pipeline) {
    try {
      html = fn(html);
      steps.push({ name, ok: true });
    } catch (e) {
      steps.push({ name, ok: false, err: String(e) });
      break;
    }
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    for (let i = 0; i < scripts.length; i++) {
      const attrs = scripts[i][1];
      const body = scripts[i][2].trim();
      if (!body || /application\/ld\+json/i.test(attrs)) continue;
      if (body.startsWith("{") || body.startsWith("[")) continue;
      try {
        new vm.Script(body, { filename: `${name}-script-${i}.js` });
      } catch (err) {
        console.log("\n=== SYNTAX ERROR after step:", name, "script index", i, "===");
        console.log(String(err.message));
        console.log("attrs:", attrs.slice(0, 80));
        console.log("body snippet:", body.slice(0, 200));
        console.log("...\n", body.slice(Math.max(0, err.loc?.column ? 0 : 0), 400));
        process.exit(1);
      }
    }
    if (html.includes("predictiveArama")) {
      console.log("predictiveArama introduced at step:", name);
      process.exit(1);
    }
  }
  console.log("Pipeline OK:", steps.map((s) => s.name).join(" -> "));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
