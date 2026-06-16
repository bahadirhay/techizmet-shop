/**
 * Admin ürün formunda toptan + fiyat özeti doğrulaması
 */
const { chromium } = require("playwright");
const { PrismaClient } = require("@prisma/client");

const BASE = "http://localhost:5556";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const prisma = new PrismaClient();

async function main() {
  const dbProduct = await prisma.storeProduct.findFirst({
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });
  let productId = dbProduct?.id ?? null;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const loginStatus = await page.evaluate(async (pwd) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "admin", password: pwd }),
    });
    return res.status;
  }, ADMIN_PASSWORD);
  if (loginStatus !== 200) {
    console.error("FAIL: login status", loginStatus);
    await browser.close();
    await prisma.$disconnect();
    process.exit(1);
  }

  if (!productId) {
    await page.goto(`${BASE}/admin/products`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const link = page.locator('a[href*="/admin/products/"][href*="/edit"]').first();
    const href = await link.getAttribute("href").catch(() => null);
    if (href) productId = href.split("/").filter(Boolean).slice(-2, -1)[0];
  }

  if (!productId) {
    console.error("FAIL: ürün bulunamadı");
    process.exit(1);
  }

  const editUrl = `${BASE}/admin/products/${productId}/edit`;
  await page.goto(editUrl, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector("text=Toptan fiyat", { timeout: 90000 }).catch(() => null);

  const html = await page.content();
  const onLogin = html.includes("Mağaza yönetimi") && html.includes("Giriş");
  const checks = {
    onLoginPage: onLogin,
    toptanField: html.includes("Toptan fiyat"),
    pricingBreakdown: html.includes("Fiyat özeti ve pazaryeri hakedişi"),
    marketplacePrices: html.includes("Pazaryeri satış fiyatları"),
    url: editUrl,
  };

  const cookies = await context.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const rulesRes = await fetch(`${BASE}/api/admin/marketplace/resolve-rules`, {
    headers: { cookie: cookieHeader },
  });
  checks.resolveRulesApi = rulesRes.status;
  if (rulesRes.ok) {
    const rulesJson = await rulesRes.json();
    checks.platformCount = Object.keys(rulesJson.rules ?? {}).length;
  }

  console.log(JSON.stringify(checks, null, 2));
  const ok =
    checks.toptanField &&
    checks.pricingBreakdown &&
    checks.marketplacePrices &&
    checks.resolveRulesApi === 200;
  await browser.close();
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
