import "server-only";

import { prisma } from "@/lib/prisma";
import { parseInvoiceLinesJson } from "@/lib/finance/invoices";

type PostingTemplateTarget = {
  direction: string;
  source: string;
  title: string | null;
  description: string | null;
  linesJson: string;
  categoryId: string | null;
  accountId: string | null;
};

export async function resolvePostingByTemplate(siteId: string, invoice: PostingTemplateTarget): Promise<{
  categoryId: string | null;
  accountId: string | null;
}> {
  if (invoice.categoryId && invoice.accountId) {
    return { categoryId: invoice.categoryId, accountId: invoice.accountId };
  }
  const templates = await prisma.financePostingTemplate.findMany({
    where: { siteId, active: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: { direction: true, source: true, keyword: true, categoryId: true, accountId: true },
  });
  if (!templates.length) {
    return { categoryId: invoice.categoryId, accountId: invoice.accountId };
  }
  const haystack = [
    invoice.title ?? "",
    invoice.description ?? "",
    ...parseInvoiceLinesJson(invoice.linesJson).map((l) => l.description),
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  const hit = templates.find((t) => {
    if (t.direction && t.direction !== invoice.direction) return false;
    if (t.source && t.source !== invoice.source) return false;
    const kw = t.keyword.trim().toLocaleLowerCase("tr-TR");
    return kw.length > 0 && haystack.includes(kw);
  });
  if (!hit) return { categoryId: invoice.categoryId, accountId: invoice.accountId };
  return {
    categoryId: invoice.categoryId ?? hit.categoryId,
    accountId: invoice.accountId ?? hit.accountId,
  };
}
