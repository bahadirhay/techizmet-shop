import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const clientDir = path.join(process.cwd(), "node_modules", ".prisma", "client");
const indexJs = path.join(clientDir, "index.js");
const engine = path.join(clientDir, "query_engine-windows.dll.node");

/** Şemaya yeni model/alan eklendiğinde bu imzayı güncelleyin */
const REQUIRED_MARKERS = [
  "NavMenuItem: 'NavMenuItem'",
  "StoreBlogPost: 'StoreBlogPost'",
  "CookieConsentLog: 'CookieConsentLog'",
  "marketplacePlatform",
  "marketplacePricesJson",
  "marketplaceMarkupPercentJson",
  "wholesalePriceMinor",
  "invoiceUuid",
  "MarketplaceCategoryMapping: 'MarketplaceCategoryMapping'",
  "MarketplaceProductListing: 'MarketplaceProductListing'",
  "FinanceTransaction: 'FinanceTransaction'",
  "AssistantKnowledgeEntry: 'AssistantKnowledgeEntry'",
  "AssistantConversation: 'AssistantConversation'",
  "AssistantMessage: 'AssistantMessage'",
];

function clientLooksCurrent() {
  if (!fs.existsSync(engine) || !fs.existsSync(indexJs)) return false;
  const src = fs.readFileSync(indexJs, "utf8");
  return REQUIRED_MARKERS.every((m) => src.includes(m));
}

if (clientLooksCurrent()) {
  console.log("[prisma] Client güncel, generate atlandı.");
  process.exit(0);
}

console.log("[prisma] Client eksik veya eski — generate çalıştırılıyor…");
if (fs.existsSync(engine)) {
  console.log(
    "[prisma] İpucu: EPERM alırsanız 5555 portundaki dev sunucusunu kapatın (Ctrl+C veya: netstat -ano | findstr :5555)",
  );
}

const r = spawnSync("npx", ["prisma", "generate"], {
  stdio: "inherit",
  shell: true,
});
process.exit(r.status ?? 1);
