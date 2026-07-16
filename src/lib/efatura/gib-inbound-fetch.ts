import "server-only";

import { randomUUID } from "crypto";

/**
 * GİB "adına düzenlenen belgeler" sorgusu.
 *
 * `fatura` paketindeki getAllInvoicesIssuedToMeByDateRange yanlışlıkla taslak
 * listesi alanlarını (hangiTip / table) gönderiyor; GİB tarafında bu
 * NullPointerException ("Genel Sistem Hatası") üretiyor.
 *
 * Çalışan PHP implementasyonları (mlevent/fatura, furkankadioglu/efatura) sadece
 * baslangic/bitis (+ isteğe bağlı hourlySearchInterval) gönderir.
 */

const CMD = "EARSIV_PORTAL_ADIMA_KESILEN_BELGELERI_GETIR";
const PAGE = "RG_ALICI_TASLAKLAR";

const BASE_URL = {
  PROD: "https://earsivportal.efatura.gov.tr",
  TEST: "https://earsivportaltest.efatura.gov.tr",
} as const;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

type GibEnv = "PROD" | "TEST";

type DispatchResponse = {
  error?: string;
  data?: unknown;
  messages?: (string | { text?: string; type?: string })[];
};

function readError(json: DispatchResponse): string | null {
  if (json.error && json.error !== "0") {
    const raw = json.messages?.[0];
    const text = typeof raw === "string" ? raw : raw?.text;
    return text || "GİB API hatası";
  }
  return null;
}

function isNullPointer(msg: string): boolean {
  return /genel sistem hatası|genel sistem hatasi|nullpointer|null pointer/i.test(msg);
}

async function dispatch(
  env: GibEnv,
  token: string,
  jp: Record<string, unknown>,
): Promise<unknown> {
  const origin = BASE_URL[env];
  const res = await fetch(`${origin}/earsiv-services/dispatch`, {
    method: "POST",
    headers: {
      accept: "*/*",
      "accept-language": "tr,en-US;q=0.9,en;q=0.8",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      pragma: "no-cache",
      referer: `${origin}/intragiris.html`,
      origin,
      "user-agent": UA,
    },
    body:
      `cmd=${encodeURIComponent(CMD)}` +
      `&callid=${encodeURIComponent(randomUUID())}` +
      `&pageName=${encodeURIComponent(PAGE)}` +
      `&token=${encodeURIComponent(token)}` +
      `&jp=${encodeURIComponent(JSON.stringify(jp))}`,
  });

  let json: DispatchResponse;
  try {
    json = (await res.json()) as DispatchResponse;
  } catch {
    throw new Error(`Geçersiz GİB yanıtı (HTTP ${res.status})`);
  }

  const err = readError(json);
  if (err) throw new Error(err);
  return json.data ?? [];
}

/** gg/AA/yyyy → Date (yerel) */
function parseTrDate(s: string): Date {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) return new Date();
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function formatTrDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Tarih aralığını en fazla `maxDays` günlük pencerelere böl */
function chunkRanges(
  startDate: string,
  endDate: string,
  maxDays: number,
): { startDate: string; endDate: string }[] {
  const start = parseTrDate(startDate);
  const end = parseTrDate(endDate);
  if (start.getTime() > end.getTime()) return [{ startDate, endDate }];

  const out: { startDate: string; endDate: string }[] = [];
  let cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setDate(chunkEnd.getDate() + maxDays - 1);
    if (chunkEnd.getTime() > end.getTime()) chunkEnd.setTime(end.getTime());
    out.push({ startDate: formatTrDate(cursor), endDate: formatTrDate(chunkEnd) });
    cursor = new Date(chunkEnd);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

const PAYLOAD_VARIANTS: ((range: { startDate: string; endDate: string }) => Record<string, unknown>)[] = [
  // mlevent/fatura — portal UI ile uyumlu
  (r) => ({
    baslangic: r.startDate,
    bitis: r.endDate,
    hourlySearchInterval: "NONE",
  }),
  // Minimal (gist / furkankadioglu)
  (r) => ({
    baslangic: r.startDate,
    bitis: r.endDate,
  }),
];

async function fetchRangeOnce(
  env: GibEnv,
  token: string,
  range: { startDate: string; endDate: string },
): Promise<unknown> {
  let lastErr: Error | null = null;
  for (const build of PAYLOAD_VARIANTS) {
    try {
      return await dispatch(env, token, build(range));
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      // NullPointer → sonraki payload varyantını dene; diğer hatalarda hemen çık
      if (!isNullPointer(lastErr.message)) throw lastErr;
    }
  }
  throw lastErr ?? new Error("GİB gelen fatura sorgusu başarısız");
}

/**
 * Adına kesilen e-Arşiv belgelerini çeker.
 * Uzun aralık NPE verirse 31 günlük pencerelere böler.
 */
export async function fetchInvoicesIssuedToMe(
  env: GibEnv,
  token: string,
  range: { startDate: string; endDate: string },
): Promise<unknown> {
  try {
    return await fetchRangeOnce(env, token, range);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!isNullPointer(msg)) throw e;

    // Geniş aralık GİB'de patlıyor olabilir — aylık parçala
    const chunks = chunkRanges(range.startDate, range.endDate, 31);
    if (chunks.length <= 1) throw e;

    const merged: unknown[] = [];
    for (const chunk of chunks) {
      try {
        const part = await fetchRangeOnce(env, token, chunk);
        if (Array.isArray(part)) merged.push(...part);
        else if (part != null) merged.push(part);
      } catch (chunkErr) {
        const cmsg = chunkErr instanceof Error ? chunkErr.message : String(chunkErr);
        // Boş sonuç / desteklenmeyen: parçayı atla; gerçek oturum hatalarını yükselt
        if (/oturum|clientip|birden fazla|güvenli çıkış|guvenli cikis|kimlik/i.test(cmsg)) {
          throw chunkErr;
        }
        if (!isNullPointer(cmsg)) throw chunkErr;
      }
    }
    return merged;
  }
}
