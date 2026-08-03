import "server-only";

import { getEfaturaConfig } from "@/lib/efatura/settings";
import { getGibSession, refreshGibSession, closeGibSession } from "@/lib/efatura/gib-session";
import { fetchInvoicesIssuedToMe } from "@/lib/efatura/gib-inbound-fetch";
import { fetchInvoicesIssuedByMe } from "@/lib/efatura/gib-outbound-fetch";
import { normalizeInvoiceLines, invoiceLinesToJson, type DraftInvoiceLineInput } from "@/lib/finance/invoices";
import { prisma } from "@/lib/prisma";

type AnyRow = Record<string, unknown>;
type GibDirection = "incoming" | "outgoing";

/** GİB tarih formatı: gg/AA/yyyy */
function gibDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** "gg/AA/yyyy" | "gg-AA-yyyy" | ISO → Date */
function parseGibDate(s: string | null): Date {
  if (!s) return new Date();
  const trSlash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (trSlash) return new Date(Number(trSlash[3]), Number(trSlash[2]) - 1, Number(trSlash[1]));
  const trDash = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s.trim());
  if (trDash) return new Date(Number(trDash[3]), Number(trDash[2]) - 1, Number(trDash[1]));
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
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
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
      if (Array.isArray(obj[key])) {
        return (obj[key] as unknown[]).filter((x): x is AnyRow => !!x && typeof x === "object");
      }
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

function normalizeKdvRate(rate: number): 1 | 10 | 20 {
  if (rate <= 2) return 1;
  if (rate <= 15) return 10;
  return 20;
}

function rowExtId(row: AnyRow): string | null {
  // GİB liste yanıtında asıl kimlik genelde ettn
  return firstStr(row, ["ettn", "uuid", "invoiceUuid", "id"]);
}

function rowTitle(row: AnyRow, direction: GibDirection): string {
  return (
    firstStr(row, ["belgeNumarasi", "invoiceNumber", "faturaNo", "documentNumber", "title"]) ||
    (direction === "outgoing" ? "GİB kesilen fatura" : "GİB gelen fatura")
  );
}

function rowCounterparty(row: AnyRow, direction: GibDirection): string {
  if (direction === "outgoing") {
    return (
      firstStr(row, ["aliciUnvanAdSoyad", "aliciUnvan", "aliciAdSoyad", "receiverTitle", "unvan"]) ||
      "GİB alıcı"
    );
  }
  return (
    firstStr(row, [
      "saticiUnvan",
      "gonderenUnvan",
      "supplierTitle",
      "senderTitle",
      "unvan",
      "aliciUnvan",
    ]) || "GİB satıcı"
  );
}

function rowTaxId(row: AnyRow, direction: GibDirection): string | null {
  if (direction === "outgoing") {
    return firstStr(row, ["aliciVknTckn", "aliciVkn", "receiverTaxId", "vknTckn", "vkn"]);
  }
  return firstStr(row, [
    "saticiVknTckn",
    "gonderenVknTckn",
    "supplierTaxId",
    "senderTaxId",
    "vknTckn",
    "vkn",
  ]);
}

function rowGrossTotal(row: AnyRow): number {
  return firstNum(row, [
    "belgeTutari",
    "odenecekTutar",
    "toplamTutar",
    "tutar",
    "grandTotalInclVAT",
    "paymentTotal",
    "malHizmetToplamTutari",
  ]);
}

function isApprovedOutgoing(row: AnyRow): boolean {
  const status = (firstStr(row, ["onayDurumu", "status", "durum"]) || "").toLocaleLowerCase("tr-TR");
  if (!status) return true;
  if (/silin|iptal|taslak|onaylanmad/i.test(status)) return false;
  return /onayland/i.test(status) || status === "onaylandı" || status === "onaylandi";
}

type ImportCounters = {
  fetched: number;
  imported: number;
  kdvEntriesCreated: number;
  skippedNoId: number;
  skippedDuplicate: number;
  skippedNotApproved: number;
  skippedZeroAmount: number;
};

async function importGibRows(
  siteId: string,
  actorUserId: string | null | undefined,
  direction: GibDirection,
  rows: AnyRow[],
  counters: ImportCounters,
) {
  counters.fetched += rows.length;

  for (const row of rows) {
    if (direction === "outgoing" && !isApprovedOutgoing(row)) {
      counters.skippedNotApproved++;
      continue;
    }

    const extId = rowExtId(row);
    if (!extId) {
      counters.skippedNoId++;
      continue;
    }

    const exists = await prisma.financeInvoice.findFirst({
      where: { siteId, source: "gib", direction, gibExternalId: extId },
      select: { id: true },
    });

    const safeIssueDate = parseGibDate(
      firstStr(row, ["belgeTarihi", "issueDate", "date", "faturaTarihi", "belgeTarihiStr"]),
    );
    const title = rowTitle(row, direction);
    const counterpartyName = rowCounterparty(row, direction);
    const taxId = rowTaxId(row, direction);
    const grossTotal = rowGrossTotal(row);

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
          direction,
          status: "pending_approval",
          issueDate: safeIssueDate,
          counterpartyType: "external_manual",
          title,
          linesJson: invoiceLinesToJson(calc.lines),
          subtotalMinor: calc.subtotalMinor,
          vatMinor: calc.vatMinor,
          totalMinor: calc.totalMinor,
          gibExternalId: extId,
          gibInvoiceNumber: firstStr(row, ["belgeNumarasi", "invoiceNumber", "faturaNo"]),
          gibUuid: firstStr(row, ["ettn", "uuid"]),
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
      counters.imported++;
    } else {
      counters.skippedDuplicate++;
    }

    const rateGroups = new Map<number, { netMinor: number; kdvMinor: number }>();
    for (const line of calc.lines) {
      const rate = normalizeKdvRate(line.vatRate);
      const g = rateGroups.get(rate) ?? { netMinor: 0, kdvMinor: 0 };
      rateGroups.set(rate, {
        netMinor: g.netMinor + line.lineSubtotalMinor,
        kdvMinor: g.kdvMinor + line.vatMinor,
      });
    }
    if (rateGroups.size === 0 && calc.subtotalMinor > 0) {
      rateGroups.set(20, { netMinor: calc.subtotalMinor, kdvMinor: calc.vatMinor });
    }

    let createdAny = false;
    for (const [rate, amounts] of rateGroups) {
      if (amounts.netMinor <= 0) continue;
      const dedupKey = `gib:${direction === "outgoing" ? "out" : "in"}:${extId}:r${rate}`;
      const legacyKey = direction === "incoming" ? `gib:${extId}:r${rate}` : null;
      const entryExists = await prisma.invoiceEntry.findFirst({
        where: {
          siteId,
          OR: legacyKey
            ? [{ invoiceNo: dedupKey }, { invoiceNo: legacyKey }]
            : [{ invoiceNo: dedupKey }],
        },
        select: { id: true },
      });
      if (entryExists) continue;

      await prisma.invoiceEntry.create({
        data: {
          siteId,
          direction,
          invoiceDate: safeIssueDate,
          invoiceNo: dedupKey,
          counterparty: taxId ? `${counterpartyName} (${taxId})` : counterpartyName,
          netMinor: amounts.netMinor,
          kdvRate: rate,
          kdvMinor: amounts.kdvMinor,
          description: title,
        },
      });
      counters.kdvEntriesCreated++;
      createdAny = true;
    }

    if (!createdAny && calc.subtotalMinor <= 0 && !exists) {
      counters.skippedZeroAmount++;
    }
  }
}

async function fetchWithRetry(
  siteId: string,
  cfg: Awaited<ReturnType<typeof getEfaturaConfig>>,
  session: Awaited<ReturnType<typeof getGibSession>>,
  fetchFn: (env: "PROD" | "TEST", token: string, range: { startDate: string; endDate: string }) => Promise<unknown>,
  range: { startDate: string; endDate: string },
): Promise<{ raw: unknown; session: Awaited<ReturnType<typeof getGibSession>> }> {
  const env = cfg.testMode ? ("TEST" as const) : ("PROD" as const);
  try {
    const raw = await fetchFn(env, session.token, range);
    return { raw, session };
  } catch {
    const refreshed = await refreshGibSession(siteId, cfg);
    const raw = await fetchFn(env, refreshed.token, range);
    return { raw, session: refreshed };
  }
}

/** GİB'den gelen (adıma kesilen) + kesilen (düzenlenen) faturaları çeker. */
export async function syncInboundGibInvoices(siteId: string, actorUserId?: string | null) {
  const cfg = await getEfaturaConfig(siteId);
  if (!cfg.enabled || !cfg.username || !cfg.password) {
    return {
      ok: false as const,
      message:
        "GİB e-Arşiv ayarları eksik. /admin/settings/efatura sayfasından kullanıcı adı ve şifre girin.",
      imported: 0,
      kdvEntriesCreated: 0,
      fetched: 0,
    };
  }

  let session: Awaited<ReturnType<typeof getGibSession>>;
  try {
    session = await getGibSession(siteId, cfg);
  } catch (e) {
    const detail =
      (e as Error & { detail?: string }).detail ||
      (e instanceof Error ? e.message : "bilinmeyen hata");
    const alreadyLoggedIn = /birden fazla giriş|birden fazla giris|güvenli çıkış|guvenli cikis/i.test(
      detail,
    );
    return {
      ok: false as const,
      message: alreadyLoggedIn
        ? `GİB'de açık bir oturum var: ${detail} · Çözüm: earsivportal.efatura.gov.tr adresine girip "Güvenli Çıkış" yapın veya birkaç dakika bekleyip tekrar deneyin.`
        : `GİB girişi başarısız: ${detail}. Kullanıcı kodu ve şifreyi /admin/settings/efatura sayfasından kontrol edin.`,
      imported: 0,
      kdvEntriesCreated: 0,
      fetched: 0,
    };
  }

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  const range = { startDate: gibDate(start), endDate: gibDate(end) };

  const counters: ImportCounters = {
    fetched: 0,
    imported: 0,
    kdvEntriesCreated: 0,
    skippedNoId: 0,
    skippedDuplicate: 0,
    skippedNotApproved: 0,
    skippedZeroAmount: 0,
  };

  let incomingRaw: unknown = [];
  let outgoingRaw: unknown = [];
  let incomingErr: string | null = null;
  let outgoingErr: string | null = null;

  try {
    const inRes = await fetchWithRetry(siteId, cfg, session, fetchInvoicesIssuedToMe, range);
    session = inRes.session;
    incomingRaw = inRes.raw;
  } catch (e) {
    incomingErr = e instanceof Error ? e.message : "bilinmeyen hata";
  }

  try {
    const outRes = await fetchWithRetry(siteId, cfg, session, fetchInvoicesIssuedByMe, range);
    session = outRes.session;
    outgoingRaw = outRes.raw;
  } catch (e) {
    outgoingErr = e instanceof Error ? e.message : "bilinmeyen hata";
  }

  if (incomingErr && outgoingErr) {
    await closeGibSession(siteId, cfg);
    const detail = `${incomingErr} / ${outgoingErr}`;
    const sessionIssue =
      /oturum geçersiz|clientip|birden fazla giriş|birden fazla giris|güvenli çıkış|guvenli cikis|kimlik doğrulanamadı|kimlik dogrulanamadi/i.test(
        detail,
      );
    return {
      ok: false as const,
      message: sessionIssue
        ? `GİB oturumu geçersiz oldu (${detail}). earsivportal.efatura.gov.tr → Güvenli Çıkış yapıp tekrar deneyin.`
        : `GİB fatura sorgusu başarısız: ${detail}`,
      imported: 0,
      kdvEntriesCreated: 0,
      fetched: 0,
    };
  }

  await importGibRows(siteId, actorUserId, "incoming", parseInboundRows(incomingRaw), counters);
  await importGibRows(siteId, actorUserId, "outgoing", parseInboundRows(outgoingRaw), counters);

  await closeGibSession(siteId, cfg);

  const parts: string[] = [];
  parts.push(`GİB’den ${counters.fetched} kayıt okundu`);
  if (counters.imported > 0 || counters.kdvEntriesCreated > 0) {
    parts.push(`${counters.imported} yeni fatura`);
    parts.push(`${counters.kdvEntriesCreated} KDV satırı`);
  } else if (counters.fetched > 0) {
    parts.push("yeni kayıt yok (zaten içe aktarılmış veya tutarsız)");
  } else {
    parts.push("liste boş — son 90 günde portalda kayıt yok");
  }
  if (incomingErr) parts.push(`gelen hata: ${incomingErr}`);
  if (outgoingErr) parts.push(`kesilen hata: ${outgoingErr}`);
  if (counters.skippedZeroAmount > 0) {
    parts.push(
      `${counters.skippedZeroAmount} faturada tutar yok (KDV için GİB Excel yükleyin)`,
    );
  }
  if (counters.skippedNotApproved > 0) {
    parts.push(`${counters.skippedNotApproved} onaylanmamış/taslak atlandı`);
  }

  return {
    ok: true as const,
    imported: counters.imported,
    kdvEntriesCreated: counters.kdvEntriesCreated,
    fetched: counters.fetched,
    message: parts.join(" · "),
  };
}
