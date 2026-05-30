import "server-only";

import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = {
  income: ["Web satış", "Pazaryeri satış", "Diğer gelir"],
  expense: [
    "Kargo & lojistik",
    "Reklam & pazarlama",
    "Pazaryeri komisyon / indirim faturası",
    "Kira & ofis",
    "Muhasebe & danışmanlık",
    "Kredi kartı harcaması",
    "Diğer gider",
  ],
};

const DEFAULT_ACCOUNTS = [
  { name: "Kasa", kind: "cash", platform: null },
  { name: "Banka hesabı", kind: "bank", platform: null },
  { name: "Kredi kartı", kind: "credit_card", platform: null },
  { name: "Trendyol alacağı", kind: "marketplace_receivable", platform: "trendyol" },
  { name: "Hepsiburada alacağı", kind: "marketplace_receivable", platform: "hepsiburada" },
  { name: "Amazon alacağı", kind: "marketplace_receivable", platform: "amazon_tr" },
];

export async function ensureFinanceDefaults(siteId: string): Promise<void> {
  const catCount = await prisma.financeCategory.count({ where: { siteId } });
  if (catCount === 0) {
    let sort = 0;
    for (const name of DEFAULT_CATEGORIES.income) {
      await prisma.financeCategory.create({
        data: { siteId, name, kind: "income", sortOrder: sort++ },
      });
    }
    sort = 0;
    for (const name of DEFAULT_CATEGORIES.expense) {
      await prisma.financeCategory.create({
        data: { siteId, name, kind: "expense", sortOrder: sort++ },
      });
    }
  }

  const accCount = await prisma.financeAccount.count({ where: { siteId } });
  if (accCount === 0) {
    for (const a of DEFAULT_ACCOUNTS) {
      await prisma.financeAccount.create({
        data: { siteId, name: a.name, kind: a.kind, platform: a.platform },
      });
    }
  }
}
