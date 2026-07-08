import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import { trendyolRequest } from "@/lib/marketplace/trendyol/client";

export type TrendyolQuestionStatus =
  | "WAITING_FOR_ANSWER"
  | "WAITING_FOR_APPROVE"
  | "ANSWERED"
  | "REPORTED"
  | "REJECTED"
  | string;

export type TrendyolQuestionItem = {
  id: number;
  text: string;
  status: TrendyolQuestionStatus;
  customerName?: string;
  showUserName?: boolean;
  productName?: string;
  barcode?: string;
  productMainId?: string;
  creationDate?: number;
};

function toQuestionItem(raw: Record<string, unknown>): TrendyolQuestionItem | null {
  const id = Number(raw.id);
  const text = String(raw.text ?? "").trim();
  if (!Number.isFinite(id) || !text) return null;
  const product = (raw.productMainId || raw.productName || raw.barcode) as unknown;
  void product;
  return {
    id,
    text,
    status: String(raw.status ?? "WAITING_FOR_ANSWER"),
    customerName: raw.userName ? String(raw.userName) : undefined,
    showUserName: raw.showUserName === true,
    productName: raw.productName ? String(raw.productName) : undefined,
    barcode: raw.barcode ? String(raw.barcode) : undefined,
    productMainId: raw.productMainId ? String(raw.productMainId) : undefined,
    creationDate: raw.creationDate != null ? Number(raw.creationDate) : undefined,
  };
}

/**
 * Trendyol müşteri sorularını çeker (getCustomerQuestions).
 * Tarih aralığı Trendyol'da max 2 hafta ile sınırlıdır.
 */
export async function fetchTrendyolQuestions(
  creds: TrendyolCredentials,
  options?: {
    status?: TrendyolQuestionStatus;
    startDate?: number;
    endDate?: number;
    maxPages?: number;
  },
): Promise<{ ok: boolean; questions: TrendyolQuestionItem[]; message: string }> {
  const status = options?.status ?? "WAITING_FOR_ANSWER";
  const maxPages = options?.maxPages ?? 20;
  // Trendyol tarih aralığı en fazla 2 hafta; verilmezse son 14 gün.
  const end = options?.endDate ?? Date.now();
  const start = options?.startDate ?? end - 14 * 24 * 60 * 60 * 1000;

  const questions: TrendyolQuestionItem[] = [];
  let page = 0;
  while (page < maxPages) {
    const params = new URLSearchParams({
      status,
      startDate: String(start),
      endDate: String(end),
      page: String(page),
      size: "50",
    });
    const path = `/integration/qna/sellers/${creds.sellerId}/questions/filter?${params.toString()}`;
    const res = await trendyolRequest(creds, path);
    if (!res.ok) {
      return {
        ok: false,
        questions,
        message: `HTTP ${res.status}: ${res.text.slice(0, 200)}`,
      };
    }

    const obj = (res.json ?? {}) as Record<string, unknown>;
    const content = Array.isArray(obj.content) ? (obj.content as Record<string, unknown>[]) : [];
    for (const raw of content) {
      const item = toQuestionItem(raw);
      if (item) questions.push(item);
    }

    const totalPages = Number(obj.totalPages ?? 1);
    page += 1;
    if (content.length === 0 || page >= totalPages) break;
  }

  return { ok: true, questions, message: `${questions.length} soru okundu (${status})` };
}

/**
 * Bir müşteri sorusunu cevaplar (answerQuestion).
 * Kurallar: cevap 10-2000 karakter olmalı; yasaklı kelime içeremez;
 * yalnızca WAITING_FOR_ANSWER durumundaki sorular cevaplanabilir.
 */
export async function answerTrendyolQuestion(
  creds: TrendyolCredentials,
  questionId: number | string,
  text: string,
): Promise<{ ok: boolean; message: string }> {
  const body = text.trim();
  if (body.length < 10) {
    return { ok: false, message: "Cevap en az 10 karakter olmalı." };
  }
  const path = `/integration/qna/sellers/${creds.sellerId}/questions/${questionId}/answers`;
  const res = await trendyolRequest(creds, path, {
    method: "POST",
    body: JSON.stringify({ text: body.slice(0, 2000) }),
  });

  if (!res.ok) {
    let detail = res.text.slice(0, 300);
    try {
      const j = JSON.parse(res.text) as { errors?: { message?: string }[]; message?: string };
      if (j.errors?.[0]?.message) detail = j.errors.map((e) => e.message).join("; ");
      else if (j.message) detail = j.message;
    } catch {
      /* raw */
    }
    return { ok: false, message: `Trendyol HTTP ${res.status}: ${detail}` };
  }

  return { ok: true, message: "Cevap Trendyol'a gönderildi (onay sonrası yayınlanır)." };
}
