import "server-only";

import { createFaturaClient } from "fatura";
import { getEfaturaConfig } from "@/lib/efatura/settings";
import { normalizeInvoiceLines, invoiceLinesToJson, type DraftInvoiceLineInput } from "@/lib/finance/invoices";
import { prisma } from "@/lib/prisma";

type AnyRow = Record<string, unknown>;

function firstStr(row: AnyRow, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickArray(row: AnyRow, keys: string[]): unknown[] {
  for (const k of keys) {
    const v = row[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

function parseInboundRows(raw: unknown): AnyRow[] {
  if (Array.isArray(raw)) return raw.filter((x): x is AnyRow => !!x && typeof x === "object");
  if (raw && typeof raw === "object") {
    const obj = raw as AnyRow;
    for (const key of ["invoices", "items", "data", "list"]) {
      if (Array.isArray(obj[key])) return (obj[key] as unknown[]).filter((x): x is AnyRow => !!x && typeof x === "object");
    }
  }
  return [];
}

function parseLines(row: AnyRow): DraftInvoiceLineInput[] {
  const arr = pickArray(row, ["lines", "satirlar", "items"]);
  const lines = arr
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const it = x as AnyRow;
      const description = firstStr(it, ["description", "aciklama", "name"]) || "Satır";
      const qty = Number(it.qty ?? it.quantity ?? 1);
      const unitPrice = Number(it.unitPrice ?? it.price ?? 0);
      const vatRate = Number(it.vatRate ?? it.kdvOrani ?? 20);
      if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return null;
      return { description, qty, unitPrice, vatRate };
    })
    .filter((x): x is DraftInvoiceLineInput => Boolean(x));
  return lines.length ? lines : [{ description: "Gelen fatura", qty: 1, unitPrice: 0, vatRate: 20 }];
}

export async function syncInboundGibInvoices(siteId: string, actorUserId?: string | null) {
  const cfg = await getEfaturaConfig(siteId);
  if (!cfg.enabled || !cfg.username || !cfg.password) {
    return { ok: false as const, message: "GİB ayarları eksik.", imported: 0 };
  }
  const clientAny = createFaturaClient(cfg.testMode ? "TEST" : "PROD") as unknown as Record<
    string,
    (...args: unknown[]) => Promise<unknown>
  >;

  const fn =
    clientAny.listIncomingInvoices ||
    clientAny.getIncomingInvoices ||
    clientAny.incomingInvoices ||
    clientAny.listInvoices;

  if (typeof fn !== "function") {
    return { ok: false as const, message: "Kullanılan fatura istemcisi gelen fatura API desteklemiyor.", imported: 0 };
  }

  const raw = await fn.call(clientAny);
  const rows = parseInboundRows(raw);
  let imported = 0;
  for (const row of rows) {
    const extId = firstStr(row, ["id", "uuid", "invoiceUuid", "ettn"]);
    if (!extId) continue;
    const exists = await prisma.financeInvoice.findFirst({
      where: { siteId, source: "gib", direction: "incoming", gibExternalId: extId },
      select: { id: true },
    });
    if (exists) continue;

    const issueDateStr = firstStr(row, ["issueDate", "date", "faturaTarihi"]);
    const issueDate = issueDateStr ? new Date(issueDateStr) : new Date();
    const linesInput = parseLines(row);
    const calc = normalizeInvoiceLines(linesInput);
    const title =
      firstStr(row, ["title", "documentNumber", "invoiceNumber", "faturaNo"]) || "GİB gelen fatura";
    const counterpartyName = firstStr(row, ["supplierTitle", "senderTitle", "unvan"]) || "GİB karşı taraf";
    const taxId = firstStr(row, ["supplierTaxId", "senderTaxId", "vkn"]);

    const created = await prisma.financeInvoice.create({
      data: {
        siteId,
        source: "gib",
        direction: "incoming",
        status: "pending_approval",
        issueDate: Number.isNaN(issueDate.getTime()) ? new Date() : issueDate,
        counterpartyType: "external_manual",
        title,
        linesJson: invoiceLinesToJson(calc.lines),
        subtotalMinor: calc.subtotalMinor,
        vatMinor: calc.vatMinor,
        totalMinor: calc.totalMinor,
        gibExternalId: extId,
        gibInvoiceNumber: firstStr(row, ["invoiceNumber", "faturaNo"]),
        gibUuid: firstStr(row, ["uuid", "ettn"]),
        gibPayloadJson: JSON.stringify(row),
        description: counterpartyName,
        createdByStaffUserId: actorUserId || null,
      },
    });
    await prisma.financeInvoiceApprovalLog.create({
      data: {
        siteId,
        action: "gib_imported",
        actorUserId: actorUserId || null,
        invoiceId: created.id,
        note: taxId ? `${counterpartyName} (${taxId})` : counterpartyName,
      },
    });
    imported++;
  }
  return { ok: true as const, imported, message: `${imported} gelen fatura içe aktarıldı.` };
}
