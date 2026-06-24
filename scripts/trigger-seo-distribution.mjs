/**
 * Arama motoru indeksleme cron'unu tetikler (yerel veya harici zamanlayıcı).
 *
 * Kullanım:
 *   SITE_URL=https://www.anatolianpaw.com CRON_SECRET=... node scripts/trigger-seo-distribution.mjs
 */
const siteUrl = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const secret = process.env.CRON_SECRET?.trim();

if (!siteUrl) {
  console.error("[seo:distribution] SITE_URL veya NEXT_PUBLIC_SITE_URL gerekli");
  process.exit(1);
}
if (!secret) {
  console.error("[seo:distribution] CRON_SECRET gerekli");
  process.exit(1);
}

const endpoint = `${siteUrl}/api/cron/seo/distribution`;

const res = await fetch(endpoint, {
  method: "GET",
  headers: { Authorization: `Bearer ${secret}` },
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  json = { raw: text.slice(0, 500) };
}

console.log("[seo:distribution]", res.status, JSON.stringify(json, null, 2));
process.exit(res.ok ? 0 : 1);
