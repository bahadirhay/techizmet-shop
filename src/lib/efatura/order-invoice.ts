import "server-only";

import { nanoid } from "nanoid";
import { buildInvoiceDetailsFromOrder } from "@/lib/efatura/build-invoice";
import { efaturaReady, getEfaturaConfig, type ResolvedEfaturaConfig } from "@/lib/efatura/settings";
import { sendMarketplaceInvoice } from "@/lib/marketplace/actions";
import { prisma } from "@/lib/prisma";
import { syncKdvFromInvoiceDate } from "@/lib/finance/kdv-sync";
import { syncGeciciObligations } from "@/lib/finance/gecici-sync";
import { getTaxConfig } from "@/lib/finance/tax";
import { parseSiteSettings } from "@/lib/site-settings";
import { getGibSession, refreshGibSession } from "@/lib/efatura/gib-session";

export type OrderInvoiceMeta = {
  publicToken?: string;
  gibDownloadUrl?: string;
  recipientTaxId?: string;
  signed?: boolean;
  marketplaceSent?: boolean;
  error?: string;
};

export type IssueOrderInvoiceResult = {
  ok: boolean;
  message: string;
  invoiceNumber?: string;
  invoiceUuid?: string;
  invoiceLink?: string;
  signed?: boolean;
};

function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:5555").replace(
    /\/$/,
    "",
  );
}

function parseInvoiceMeta(raw: string | null | undefined): OrderInvoiceMeta {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as OrderInvoiceMeta;
  } catch {
    return {};
  }
}

function extractDocumentNumber(found: Record<string, unknown> | undefined): string | undefined {
  if (!found) return undefined;
  const keys = ["belgeNumarasi", "faturaNo", "invoiceNumber", "documentNumber"];
  for (const k of keys) {
    const v = found[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** GİB tarih formatı (gg/aa/yyyy) — sorgu aralığı için. Vercel UTC ile üretildiği için UTC kullanır. */
function gibDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/**
 * Fatura GİB'de onaylanmış (imzalı) mı? Portalda SMS ile onaylandıysa onayDurumu
 * "Onaylandı" olur ve gerçek belge numarası atanır.
 */
function isSignedInvoice(found: Record<string, unknown> | undefined): boolean {
  if (!found) return false;
  const onay = typeof found.onayDurumu === "string" ? found.onayDurumu.trim() : "";
  if (onay === "Onaylandı" || onay === "Onaylandi") return true;
  const no = extractDocumentNumber(found);
  return Boolean(no && !no.toUpperCase().startsWith("DRAFT"));
}

const GIB_CALL_TIMEOUT_MS = 30_000;

/**
 * GİB çağrısını zaman aşımına karşı korur. GİB yanıt vermezse istek sonsuza
 * kadar asılı kalmasın diye belirli süre sonra hata fırlatır (düzgün mesaj döner,
 * boş gövdeli 500 / takılı ekran oluşmaz).
 */
function withGibTimeout<T>(p: Promise<T>, label: string, ms = GIB_CALL_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label}: GİB ${Math.round(ms / 1000)} sn içinde yanıt vermedi (zaman aşımı). Lütfen tekrar deneyin.`)),
        ms,
      ),
    ),
  ]);
}

export async function issueOrderInvoice(
  siteId: string,
  orderId: string,
  options: {
    recipientTaxId?: string;
    sign?: boolean;
    sendToMarketplace?: boolean;
    force?: boolean;
  } = {},
): Promise<IssueOrderInvoiceResult> {
  const config = await getEfaturaConfig(siteId);
  if (!efaturaReady(config)) {
    return {
      ok: false,
      message: "e-Arşiv ayarları eksik. Ayarlar → e-Fatura bölümünden GİB kullanıcı kodu ve parolasını girin.",
    };
  }

  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    include: { lines: true },
  });
  if (!order) return { ok: false, message: "Sipariş bulunamadı" };

  if (order.invoiceStatus === "signed" && !options.force) {
    return {
      ok: false,
      message: "Bu sipariş için fatura zaten kesilmiş.",
      invoiceNumber: order.invoiceNumber ?? undefined,
      invoiceUuid: order.invoiceUuid ?? undefined,
      invoiceLink: order.invoiceLink ?? undefined,
    };
  }

  const invoiceDetails = buildInvoiceDetailsFromOrder(order, config, options.recipientTaxId);
  const sign = options.sign ?? config.autoSign;

  type FaturaClient = {
    createDraftInvoice: (t: string, d: unknown) => Promise<{ uuid: string; date: string }>;
    findInvoice: (t: string, d: { uuid: string; date?: string }) => Promise<Record<string, unknown> | undefined>;
    signDraftInvoice: (t: string, f: unknown) => Promise<void>;
    getDownloadURL: (t: string, uuid: string, opts: { signed: boolean }) => string;
    getAllInvoicesByDateRange: (
      t: string,
      r: { startDate: string; endDate: string },
    ) => Promise<Array<Record<string, unknown> & { ettn?: string }>>;
  };

  /** Var olan taslağı ETTN ile GİB'de bulur (yeniden oluşturmadan güncel durumu okur). */
  async function findInvoiceByEttn(
    c: FaturaClient,
    t: string,
    uuid: string,
    around: Date,
  ): Promise<Record<string, unknown> | undefined> {
    const start = new Date(around.getTime() - 2 * 86_400_000);
    const end = new Date(around.getTime() + 2 * 86_400_000);
    const list = await c.getAllInvoicesByDateRange(t, {
      startDate: gibDateStr(start),
      endDate: gibDateStr(end),
    });
    return list.find((i) => i.ettn === uuid);
  }

  // Cached session — 90 dakika boyunca token yeniden kullanılır.
  // Oturum edinimi de try içinde: login takılır/hata verirse boş 500 yerine düzgün mesaj döner.
  let session!: Awaited<ReturnType<typeof getGibSession>>;
  let client!: FaturaClient;
  let token!: string;

  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      // Token süresi dolmuş olabilir — session'ı yenile ve bir kez daha dene
      const refreshed = await refreshGibSession(siteId, config);
      client = refreshed.client as unknown as FaturaClient;
      token = refreshed.token;
      return fn();
    }
  }

  const isMarketplaceOrder = Boolean(order.marketplacePlatform && order.marketplaceMetaJson);

  try {
    session = await withGibTimeout(getGibSession(siteId, config), "GİB oturumu açılamadı");
    client = session.client as unknown as FaturaClient;
    token = session.token;

    // Var olan taslak yeniden oluşturulmasın (mükerrer taslak olmasın). Bunun yerine
    // GİB'deki güncel durumu sorgula: kullanıcı portaldan SMS ile onayladıysa artık imzalıdır.
    const existingUuid = order.invoiceUuid?.trim();
    const canReconcile =
      Boolean(existingUuid) &&
      order.invoiceStatus !== "signed" &&
      order.invoiceStatus !== "marketplace_sent" &&
      !options.force;

    let draftRef!: { uuid: string; date?: string };
    let found: Record<string, unknown> | undefined;
    const aroundDate = order.invoiceIssuedAt ?? order.createdAt;

    if (canReconcile) {
      found = await withRetry(() =>
        withGibTimeout(
          findInvoiceByEttn(client, token, existingUuid!, aroundDate),
          "Fatura sorgulama",
        ),
      );
      draftRef = { uuid: existingUuid!, date: gibDateStr(aroundDate) };
      // Taslak GİB'de yoksa yanlışlıkla mükerrer taslak oluşturma — kullanıcıyı bilgilendir.
      if (!found) {
        return {
          ok: false,
          message:
            "GİB'de bu fatura taslağı bulunamadı. Portalda yeni onayladıysanız 1-2 dakika bekleyip tekrar deneyin. " +
            "Taslak portaldan silindiyse 'Yeniden oluştur' ile yeni taslak kesin.",
          invoiceUuid: existingUuid,
        };
      }
    }

    // İlk kesim (canReconcile false) → yeni taslak oluştur.
    if (!found) {
      const draft = await withRetry(() =>
        withGibTimeout(client.createDraftInvoice(token, invoiceDetails), "Taslak fatura oluşturma"),
      );
      draftRef = draft;
      found = await withRetry(() =>
        withGibTimeout(client.findInvoice(token, draft), "Fatura sorgulama"),
      );
    }

    // Portalda zaten onaylanmış olabilir.
    let signed = isSignedInvoice(found);
    let invoiceNumber = extractDocumentNumber(found);

    // Henüz imzasızsa e-imza (HSM) cihazıyla imzalamayı dene. Cihaz yoksa bu adım hata
    // verir; taslak korunur ve kullanıcı GİB portalından SMS ile onaylar.
    if (sign && !signed && found) {
      try {
        await withRetry(() =>
          withGibTimeout(client.signDraftInvoice(token, found), "Fatura imzalama"),
        );
        const afterSign = await withRetry(() =>
          withGibTimeout(client.findInvoice(token, draftRef), "Fatura sorgulama"),
        );
        found = afterSign ?? found;
        signed = true;
        invoiceNumber = extractDocumentNumber(afterSign) ?? invoiceNumber;
      } catch (signErr) {
        const msg = signErr instanceof Error ? signErr.message : String(signErr);
        // İmzalanamadı ama taslak oluşturuldu — e-imza cihazı yoksa beklenen durum.
        console.warn("[invoice] HSM imzalama başarısız (e-imza cihazı yoksa normaldir), taslak kaydedildi:", msg);
      }
    }

    const hasRealInvoiceNo = Boolean(invoiceNumber && !invoiceNumber.toUpperCase().startsWith("DRAFT"));
    const invoiceUuid = draftRef.uuid;
    const publicToken = parseInvoiceMeta(order.invoiceMetaJson).publicToken ?? nanoid(24);
    const gibDownloadUrl = client.getDownloadURL(token, invoiceUuid, { signed });

    const invoiceLink = `${siteBaseUrl()}/api/public/invoice/${publicToken}`;
    const status = signed ? "signed" : "draft";

    const meta: OrderInvoiceMeta = {
      publicToken,
      gibDownloadUrl,
      recipientTaxId: options.recipientTaxId ?? config.defaultConsumerTaxId,
      signed,
    };

    await prisma.storeOrder.update({
      where: { id: orderId },
      data: {
        invoiceNumber: invoiceNumber ?? `DRAFT-${order.orderNumber}`.slice(0, 32),
        invoiceUuid,
        invoiceLink,
        invoiceStatus: status,
        // Reconcile'da orijinal kesim tarihini koru (GİB sorgusu bu tarihe dayanır).
        invoiceIssuedAt: canReconcile ? aroundDate : new Date(),
        invoiceMetaJson: JSON.stringify(meta),
        adminNotes: [order.adminNotes, `e-Arşiv: ${invoiceNumber ?? invoiceUuid}`].filter(Boolean).join(" · "),
      },
    });

    let message = signed
      ? `e-Arşiv faturası imzalandı (${invoiceNumber ?? invoiceUuid})`
      : `e-Arşiv taslağı GİB'de hazır. Sunucuda e-imza cihazı olmadığından otomatik imzalanamadı. ` +
        `GİB e-Arşiv portalına girip taslağı SMS ile onaylayın, ardından bu ekrandan tekrar "Onayla ve GİB'e gönder" deyin — ` +
        `sistem imzalı fatura numarasını çekip ${isMarketplaceOrder ? "pazaryerine gönderir" : "kaydeder"}.`;

    // Pazaryerine SADECE imzalı ve gerçek numaralı fatura gönderilir; aksi halde
    // "Fatura numarası hatalıdır" hatası alınır.
    const shouldSendMarketplace =
      (options.sendToMarketplace ?? config.autoSendMarketplace) &&
      isMarketplaceOrder &&
      signed &&
      hasRealInvoiceNo;

    if (shouldSendMarketplace) {
      const mp = await sendMarketplaceInvoice(siteId, orderId, {
        invoiceLink,
        invoiceNumber: invoiceNumber ?? undefined,
      });
      if (mp.ok) {
        meta.marketplaceSent = true;
        await prisma.storeOrder.update({
          where: { id: orderId },
          data: {
            invoiceStatus: "marketplace_sent",
            invoiceMetaJson: JSON.stringify(meta),
          },
        });
        message += ` · ${mp.message}`;
      } else {
        message += ` · Pazaryeri: ${mp.message}`;
      }
    } else if (isMarketplaceOrder && !signed) {
      message += " · Pazaryerine gönderim, fatura imzalandıktan sonra yapılacak.";
    }

    // InvoiceEntry bridge — sipariş faturasını KDV takibine ekle
    try {
      const dedupKey = `order:${order.orderNumber}`;
      const entryExists = await prisma.invoiceEntry.findFirst({
        where: { siteId, invoiceNo: dedupKey },
        select: { id: true },
      });
      if (!entryExists) {
        const defaultRate = config.defaultVatRate;
        // Satırları KDV oranına göre grupla
        const rateGroups = new Map<number, number>(); // rate → netMinor
        for (const l of order.lines) {
          const rate = l.vatRate ?? defaultRate;
          const normalRate = rate <= 2 ? 1 : rate <= 15 ? 10 : 20;
          const lineNet = Math.max(0, l.lineMinor - (l.discountMinor ?? 0));
          rateGroups.set(normalRate, (rateGroups.get(normalRate) ?? 0) + lineNet);
        }
        if (order.shippingMinor > 0) {
          const sr = defaultRate <= 2 ? 1 : defaultRate <= 15 ? 10 : 20;
          rateGroups.set(sr, (rateGroups.get(sr) ?? 0) + order.shippingMinor);
        }
        for (const [rate, lineTotal] of rateGroups) {
          // lineTotal burada KDV dahil (order.lineMinor = total incl. VAT)
          const netMinor = Math.round(lineTotal / (1 + rate / 100));
          const kdvMinor = lineTotal - netMinor;
          await prisma.invoiceEntry.create({
            data: {
              siteId,
              direction: "outgoing",
              invoiceDate: order.createdAt,
              invoiceNo: rateGroups.size > 1 ? `${dedupKey}:r${rate}` : dedupKey,
              counterparty: order.customerName?.trim() || "Tüketici",
              netMinor,
              kdvRate: rate as 1 | 10 | 20,
              kdvMinor,
              description: `${order.marketplacePlatform ? order.marketplacePlatform + " · " : ""}Sipariş #${order.orderNumber}`,
            },
          });
        }
        // Obligations senkronize et
        const site = await prisma.storeSite.findUnique({ where: { id: siteId }, select: { settingsJson: true } });
        const taxConfig = getTaxConfig(parseSiteSettings(site?.settingsJson ?? null));
        await syncKdvFromInvoiceDate(siteId, order.createdAt);
        await syncGeciciObligations(siteId, order.createdAt.getUTCFullYear(), taxConfig.incomeBrackets);
      }
    } catch (kdvErr) {
      console.error("[invoice-entry-bridge]", kdvErr);
    }

    return {
      ok: true,
      message,
      invoiceNumber: invoiceNumber ?? undefined,
      invoiceUuid,
      invoiceLink,
      signed,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `GİB hatası: ${msg}` };
  }
}

export async function getPublicInvoiceHtml(publicToken: string): Promise<string | null> {
  const orders = await prisma.storeOrder.findMany({
    where: { invoiceMetaJson: { contains: publicToken } },
    take: 5,
    select: {
      id: true,
      siteId: true,
      invoiceUuid: true,
      invoiceMetaJson: true,
      invoiceStatus: true,
    },
  });

  const order = orders.find((o) => parseInvoiceMeta(o.invoiceMetaJson).publicToken === publicToken);
  if (!order?.invoiceUuid) return null;

  const config = await getEfaturaConfig(order.siteId);
  if (!efaturaReady(config)) return null;

  const meta = parseInvoiceMeta(order.invoiceMetaJson);
  const { createFaturaClient } = await import("fatura");
  const client = createFaturaClient(config.testMode ? "TEST" : "PROD");
  try {
    const token = await client.getToken(config.username, config.password);
    const html = await client.getInvoiceHTML(token, order.invoiceUuid, { signed: meta.signed === true });
    await client.logout(token);
    return html;
  } catch {
    return null;
  }
}
