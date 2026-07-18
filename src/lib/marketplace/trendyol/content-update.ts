import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import { trendyolApiBase, trendyolRequest } from "@/lib/marketplace/trendyol/client";
import { trendyolAuthHeaders } from "@/lib/marketplace/trendyol/headers";
import { checkTrendyolBatchRequest } from "@/lib/marketplace/trendyol/categories";

export type TrendyolContentBulkItem = {
  contentId: number;
  title?: string;
  description?: string;
  /** Boş bırakın — anatolianpaw /api/media QC'de MEDIA'yı bozabilir; description img ayrı */
  images?: { url: string }[];
};

export type TrendyolContentBulkResult = {
  ok: boolean;
  sent: number;
  message: string;
  batchRequestId?: string;
  qcFails?: string[];
};

export type TrendyolUpdateAudit = {
  batchRequestId?: string;
  requestDate?: string;
  updates: {
    type: string;
    status: string;
    rejectReasons?: { type?: string; reason?: string; detail?: string }[];
  }[];
};

/** Onaylı ürün content QC sonuçları */
export async function fetchTrendyolUpdateAudits(
  creds: TrendyolCredentials,
  contentId: number,
  options?: { page?: number; size?: number },
): Promise<{ ok: boolean; audits: TrendyolUpdateAudit[]; message: string }> {
  const page = options?.page ?? 0;
  const size = options?.size ?? 20;
  const path = `/integration/product/sellers/${creds.sellerId}/products/${contentId}/update-audits?page=${page}&size=${size}`;
  const res = await trendyolRequest(creds, path);
  if (!res.ok) {
    return { ok: false, audits: [], message: `QC audits HTTP ${res.status}` };
  }
  const obj = (res.json ?? {}) as { content?: Record<string, unknown>[] };
  const rows = Array.isArray(obj.content) ? obj.content : [];
  const audits: TrendyolUpdateAudit[] = rows.map((row) => ({
    batchRequestId: row.batchRequestId != null ? String(row.batchRequestId) : undefined,
    requestDate: row.requestDate != null ? String(row.requestDate) : undefined,
    updates: Array.isArray(row.updates)
      ? (row.updates as Record<string, unknown>[]).map((u) => ({
          type: String(u.type ?? ""),
          status: String(u.status ?? ""),
          rejectReasons: Array.isArray(u.rejectReasons)
            ? (u.rejectReasons as Record<string, unknown>[]).map((r) => ({
                type: r.type != null ? String(r.type) : undefined,
                reason: r.reason != null ? String(r.reason) : undefined,
                detail: r.detail != null ? String(r.detail) : undefined,
              }))
            : undefined,
        }))
      : [],
  }));
  return { ok: true, audits, message: `${audits.length} QC kaydı` };
}

/**
 * Onaylı ürün başlık / açıklama — vitrin content günceller.
 * POST .../products/content-bulk-update
 */
export async function sendTrendyolContentBulkUpdate(
  creds: TrendyolCredentials,
  items: TrendyolContentBulkItem[],
  options?: { storeFrontCode?: string; pollQc?: boolean },
): Promise<TrendyolContentBulkResult> {
  if (items.length === 0) {
    return { ok: true, sent: 0, message: "" };
  }

  const storeFrontCode = (options?.storeFrontCode ?? "TR").trim() || "TR";
  const url = `${trendyolApiBase(creds)}/integration/product/sellers/${creds.sellerId}/products/content-bulk-update`;

  // images gönderme — yanlış URL mevcut CDN görsellerini ezer / QC fail
  const payloadItems = items.map((it) => {
    const row: Record<string, unknown> = { contentId: it.contentId };
    if (it.title != null) row.title = it.title;
    if (it.description != null) row.description = it.description;
    if (it.images?.length) {
      const safe = it.images.filter((im) => /cdn\.dsmcdn\.com/i.test(im.url));
      if (safe.length) row.images = safe;
    }
    return row;
  });

  const res = await fetch(url, {
    method: "POST",
    headers: trendyolAuthHeaders(creds, { storeFrontCode }),
    body: JSON.stringify({ items: payloadItems }),
  });
  const text = await res.text();
  let detail = text.slice(0, 500);
  let batchRequestId: string | undefined;
  try {
    const j = JSON.parse(text) as { errors?: { message?: string }[]; batchRequestId?: string };
    if (j.batchRequestId) {
      batchRequestId = j.batchRequestId;
      detail = `batchRequestId: ${j.batchRequestId}`;
    }
    if (j.errors?.[0]?.message) detail = j.errors.map((e) => e.message).join("; ");
  } catch {
    /* raw */
  }

  if (!res.ok) {
    return {
      ok: false,
      sent: 0,
      message: `Trendyol content-bulk HTTP ${res.status}: ${detail}`,
      batchRequestId,
    };
  }

  let batchSummary = "";
  let failed = 0;
  let okCount = 0;
  if (batchRequestId) {
    for (let attempt = 0; attempt < 6; attempt++) {
      await new Promise((r) => setTimeout(r, attempt === 0 ? 2000 : 3000));
      const batch = await checkTrendyolBatchRequest(creds, batchRequestId);
      if (!batch.ok) break;
      if (batch.status === "COMPLETED" || batch.items.length > 0) {
        failed = 0;
        okCount = 0;
        for (const it of batch.items) {
          if (it.status === "FAILED") failed++;
          else if (it.status === "SUCCESS") okCount++;
        }
        batchSummary = ` · Batch: ${okCount} kabul, ${failed} hata`;
        if (batch.status === "COMPLETED") break;
      }
    }
    if (!batchSummary) {
      batchSummary = ` · Batch kuyrukta (id: ${batchRequestId.slice(0, 12)}…)`;
    }
  }

  const qcFails: string[] = [];
  if (options?.pollQc !== false && batchRequestId) {
    // QC description/title ayrı onay — birkaç sn bekle
    await new Promise((r) => setTimeout(r, 4000));
    for (const it of items) {
      const audits = await fetchTrendyolUpdateAudits(creds, it.contentId, { size: 5 });
      if (!audits.ok) continue;
      const match =
        audits.audits.find((a) => a.batchRequestId === batchRequestId) ?? audits.audits[0];
      if (!match) continue;
      for (const u of match.updates) {
        if (u.status === "FAIL") {
          const reason =
            u.rejectReasons?.map((r) => r.reason || r.type || r.detail).filter(Boolean).join("; ") ||
            "QC reddi";
          qcFails.push(`${u.type}: ${reason}`);
        }
      }
    }
  }

  const qcNote = qcFails.length ? ` · QC: ${qcFails.slice(0, 3).join(" | ")}` : "";
  return {
    ok: failed === 0 && qcFails.length === 0,
    sent: items.length,
    message: `${items.length} onaylı ürün içeriği gönderildi. ${detail}${batchSummary}${qcNote}`,
    batchRequestId,
    qcFails,
  };
}
