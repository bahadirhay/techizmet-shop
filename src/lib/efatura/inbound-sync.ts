import "server-only";

import { createFaturaClient } from "fatura";
import { gibLogin } from "@/lib/efatura/gib-login";
import { getEfaturaConfig } from "@/lib/efatura/settings";
import { normalizeInvoiceLines, invoiceLinesToJson, type DraftInvoiceLineInput } from "@/lib/finance/invoices";
import { prisma } from "@/lib/prisma";

type AnyRow = Record<string, unknown>;

/** GİB tarih formatı: gg/AA/yyyy */
function gibDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** "gg/AA/yyyy" veya ISO tarihini Date'e çevir */
function parseGibDate(s: string | null): Date {
  if (!s) return new Date();
  const tr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (tr) return new Date(Number(tr[3]), Number(tr[2]) - 1, Number(tr[1]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function firstNum(row: AnyRow, keys: string[]): number {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

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

/** GİB'den gelen KDV oranını geçerli bir InvoiceEntry oranına (1|10|20) yuvarla */
function normalizeKdvRate(rate: number): 1 | 10 | 20 {
  if (rate <= 2) return 1;
  if (rate <= 15) return 10;
  return 20;
}

export async function syncInboundGibInvoices(siteId: string, actorUserId?: string | null) {
  const cfg = await getEfaturaConfig(siteId);
  if (!cfg.enabled || !cfg.username || !cfg.password) {
    return { ok: false as const, message: "GİB e-Arşiv ayarları eksik. /admin/settings/efatura sayfasından kullanıcı adı ve şifre girin.", imported: 0, kdvEntriesCreated: 0 };
  }
  const env = cfg.testMode ? "TEST" : "PROD";

  // 1) GİB'e giriş yap (birden fazla komut varyantı deneyen yardımcı ile token al)
  let token: string;
  try {
    const login = await gibLogin(env, cfg.username, cfg.password);
    token = login.token;
  } catch (e) {
    const detail = (e as Error & { detail?: string }).detail || (e instanceof Error ? e.message : "bilinmeyen hata");
    return {
      ok: false as const,
      message: `GİB girişi başarısız: ${detail}. Kullanıcı kodu ve şifreyi /admin/settings/efatura sayfasından kontrol edin.`,
      imported: 0,
      kdvEntriesCreated: 0,
    };
  }

  // 2) Son 90 günde adıma kesilen belgeleri getir
  const client = createFaturaClient(env) as unknown as {
    getAllInvoicesIssuedToMeByDateRange: (
      token: string,
      range: { startDate: string; endDate: string },
    ) => Promise<unknown>;
  };

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);

  let raw: unknown;
  try {
    raw = await client.getAllInvoicesIssuedToMeByDateRange(token, {
      startDate: gibDate(start),
      endDate: gibDate(end),
    });
  } catch (e) {
    return {
      ok: false as const,
      message: `GİB gelen fatura sorgusu başarısız: ${e instanceof Error ? e.message : "bilinmeyen hata"}`,
      imported: 0,
      kdvEntriesCreated: 0,
    };
  }

  const rows = parseInboundRows(raw);
  let imported = 0;
  let kdvEntriesCreated = 0;

  for (const row of rows) {
    const extId = firstStr(row, ["id", "uuid", "invoiceUuid", "ettn"]);
    if (!extId) continue;

    // ── FinanceInvoice (onay akışı) ────────────────────────────────────────
    const exists = await prisma.financeInvoice.findFirst({
      where: { siteId, source: "gib", direction: "incoming", gibExternalId: extId },
      select: { id: true },
    });

    const safeIssueDate = parseGibDate(
      firstStr(row, ["issueDate", "date", "faturaTarihi", "belgeTarihi"]),
    );

    const title =
      firstStr(row, ["title", "belgeNumarasi", "documentNumber", "invoiceNumber", "faturaNo"]) ||
      "GİB gelen fatura";
    const counterpartyName =
      firstStr(row, ["saticiUnvan", "gonderenUnvan", "supplierTitle", "senderTitle", "unvan", "aliciUnvan"]) ||
      "GİB karşı taraf";
    const taxId = firstStr(row, [
      "saticiVknTckn",
      "gonderenVknTckn",
      "supplierTaxId",
      "senderTaxId",
      "vknTckn",
      "vkn",
    ]);

    // GİB liste yanıtı satır kalemi içermez; belge tutarından tek satır üret.
    // Toplam KDV dahil kabul edilip %20 ile net'e indirgenir (onay ekranında düzeltilebilir).
    const grossTotal = firstNum(row, [
      "belgeTutari",
      "tutar",
      "toplamTutar",
      "grandTotalInclVAT",
      "paymentTotal",
      "odenecekTutar",
    ]);
    const linesInput: DraftInvoiceLineInput[] =
      grossTotal > 0
        ? [{ description: title, qty: 1, unitPrice: grossTotal / 1.2, vatRate: 20 }]
        : parseLines(row);
    const calc = normalizeInvoiceLines(linesInput);

    if (!exists) {
      const created = await prisma.financeInvoice.create({
        data: {
          siteId,
          source: "gib",
          direction: "incoming",
          status: "pending_approval",
          issueDate: safeIssueDate,
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

    // ── InvoiceEntry (KDV takibi) ──────────────────────────────────────────
    // Satırları KDV oranına göre grupla, her oran için ayrı InvoiceEntry yaz
    const rateGroups = new Map<number, { netMinor: number; kdvMinor: number }>();
    for (const line of calc.lines) {
      const rate = normalizeKdvRate(line.vatRate);
      const g = rateGroups.get(rate) ?? { netMinor: 0, kdvMinor: 0 };
      rateGroups.set(rate, {
        netMinor: g.netMinor + line.lineSubtotalMinor,
        kdvMinor: g.kdvMinor + line.vatMinor,
      });
    }
    // Eğer satır yoksa (unitPrice=0 gibi) calc.subtotalMinor'dan tek giriş yap
    if (rateGroups.size === 0 && calc.subtotalMinor > 0) {
      rateGroups.set(20, { netMinor: calc.subtotalMinor, kdvMinor: calc.vatMinor });
    }

    for (const [rate, amounts] of rateGroups) {
      if (amounts.netMinor <= 0) continue;
      const dedupKey = `gib:${extId}:r${rate}`;
      const entryExists = await prisma.invoiceEntry.findFirst({
        where: { siteId, invoiceNo: dedupKey },
        select: { id: true },
      });
      if (entryExists) continue;

      await prisma.invoiceEntry.create({
        data: {
          siteId,
          direction: "incoming",
          invoiceDate: safeIssueDate,
          invoiceNo: dedupKey,
          counterparty: taxId ? `${counterpartyName} (${taxId})` : counterpartyName,
          netMinor: amounts.netMinor,
          kdvRate: rate,
          kdvMinor: amounts.kdvMinor,
          description: title,
        },
      });
      kdvEntriesCreated++;
    }
  }

  return {
    ok: true as const,
    imported,
    kdvEntriesCreated,
    message:
      imported > 0 || kdvEntriesCreated > 0
        ? `${imported} yeni fatura, ${kdvEntriesCreated} KDV kaydı içe aktarıldı.`
        : "Yeni fatura bulunamadı (tümü zaten içe aktarılmış).",
  };
}
