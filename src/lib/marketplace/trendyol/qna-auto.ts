import "server-only";

import { prisma } from "@/lib/prisma";
import { runAssistantPipeline } from "@/lib/assistant/run-pipeline";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import {
  answerTrendyolQuestion,
  fetchTrendyolQuestions,
  type TrendyolQuestionItem,
} from "@/lib/marketplace/trendyol/questions";

export type QnaMode = "hybrid" | "auto" | "draft";

export type QnaRunResult = {
  ok: boolean;
  fetched: number;
  autoAnswered: number;
  queuedForReview: number;
  skipped: number;
  failed: number;
  message: string;
  details: string[];
};

const DEFAULT_THRESHOLD = 0.75;

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Cevabı Trendyol kurallarına göre temizler:
 * - iletişim bilgisi (link, e-posta, telefon) yasak → temizle
 * - 10-2000 karakter sınırı
 */
export function sanitizeQnaAnswer(reply: string): string {
  let t = reply
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/www\.\S+/gi, "")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, "")
    // 10+ haneli telefon benzeri diziler
    .replace(/(\+?\d[\d\s().-]{9,}\d)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (t.length > 2000) t = t.slice(0, 1997).trimEnd() + "…";
  return t;
}

/** Pipeline cevabı Trendyol'a gönderilebilir mi? (handoff/fallback gönderilmez) */
function isUsableAnswer(layer: string, reply: string): boolean {
  if (layer !== "knowledge" && layer !== "ai") return false;
  return sanitizeQnaAnswer(reply).length >= 10;
}

async function matchProduct(siteId: string, q: TrendyolQuestionItem) {
  if (q.barcode) {
    const byBarcode = await prisma.storeProduct.findFirst({
      where: { siteId, barcode: q.barcode },
      select: { id: true, title: true },
    });
    if (byBarcode) return byBarcode;
  }
  if (q.productMainId) {
    const bySku = await prisma.storeProduct.findFirst({
      where: { siteId, sku: q.productMainId },
      select: { id: true, title: true },
    });
    if (bySku) return bySku;
  }
  return null;
}

/**
 * Trendyol müşteri sorularını çekip kütüphane + AI ile cevaplandırır.
 * Hibrit mod: yüksek güvenli cevaplar otomatik gönderilir, düşük güvenliler
 * admin onay kuyruğuna (needs_review) düşer.
 */
export async function runTrendyolQnaAutomation(options: {
  siteId: string;
  /** true: config'teki qnaAuto/throttle kontrollerini atla (manuel tetik) */
  force?: boolean;
}): Promise<QnaRunResult> {
  const { siteId, force } = options;
  const empty: QnaRunResult = {
    ok: true,
    fetched: 0,
    autoAnswered: 0,
    queuedForReview: 0,
    skipped: 0,
    failed: 0,
    message: "",
    details: [],
  };

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId, platform: "trendyol" },
  });
  if (!integration || !integration.active) {
    return { ...empty, ok: false, message: "Trendyol entegrasyonu aktif değil." };
  }

  const config = parseConfig(integration.configJson);
  const creds = parseTrendyolConfig(config);
  if (!creds) {
    return { ...empty, ok: false, message: "Trendyol API bilgileri eksik." };
  }

  if (!force && config.qnaAuto !== "true") {
    return { ...empty, message: "Otomatik soru-cevap kapalı (qnaAuto)." };
  }

  const mode = (config.qnaMode as QnaMode) || "hybrid";
  const threshold = Number(config.qnaAutoThreshold) || DEFAULT_THRESHOLD;

  const fetchRes = await fetchTrendyolQuestions(creds, { status: "WAITING_FOR_ANSWER" });
  if (!fetchRes.ok) {
    return { ...empty, ok: false, message: `Sorular çekilemedi: ${fetchRes.message}` };
  }

  const details: string[] = [];
  let autoAnswered = 0;
  let queuedForReview = 0;
  let skipped = 0;
  let failed = 0;

  for (const q of fetchRes.questions) {
    const questionId = String(q.id);

    // Zaten işlenmiş mi? (gönderilmiş/atlanmış/onay kuyruğunda → dokunma; failed → tekrar dene)
    const existing = await prisma.trendyolQuestion.findUnique({
      where: { siteId_questionId: { siteId, questionId } },
      select: { id: true, answerStatus: true },
    });
    if (
      existing &&
      ["sent", "skipped", "needs_review", "answered_elsewhere"].includes(existing.answerStatus)
    ) {
      continue;
    }

    const product = await matchProduct(siteId, q);
    const context = q.productName || product?.title || "";
    const message = context ? `[Ürün: ${context}] ${q.text}` : q.text;

    const pipeline = await runAssistantPipeline({
      siteId,
      channel: "trendyol",
      externalUserId: `ty-q-${questionId}`,
      message,
      persist: false,
    });

    const usable = isUsableAnswer(pipeline.layer, pipeline.reply);
    const answerText = usable ? sanitizeQnaAnswer(pipeline.reply) : null;
    const answerSource = pipeline.layer === "knowledge" ? "knowledge" : pipeline.layer === "ai" ? "ai" : null;

    const baseData = {
      siteId,
      platform: "trendyol",
      questionId,
      questionText: q.text,
      customerName: q.customerName ?? null,
      productBarcode: q.barcode ?? null,
      productName: q.productName ?? product?.title ?? null,
      productId: product?.id ?? null,
      tyStatus: q.status,
      askedAt: q.creationDate ? new Date(q.creationDate) : null,
      confidence: pipeline.confidence,
      answerLayer: pipeline.layer,
    };

    // Cevap üretilemedi → insana bırak (skipped)
    if (!usable || !answerText) {
      await prisma.trendyolQuestion.upsert({
        where: { siteId_questionId: { siteId, questionId } },
        create: {
          ...baseData,
          answerStatus: "skipped",
          answerText: null,
          answerSource: null,
          lastError: "Otomatik cevap üretilemedi — elle cevaplayın.",
        },
        update: {
          ...baseData,
          answerStatus: "skipped",
          lastError: "Otomatik cevap üretilemedi — elle cevaplayın.",
        },
      });
      skipped++;
      details.push(`~ #${questionId}: cevap üretilemedi, insana bırakıldı`);
      continue;
    }

    // Otomatik gönderilecek mi? hibrit: güven >= eşik; auto: her zaman; draft: asla
    const shouldAutoSend =
      mode === "auto" || (mode === "hybrid" && pipeline.confidence >= threshold);

    if (!shouldAutoSend) {
      await prisma.trendyolQuestion.upsert({
        where: { siteId_questionId: { siteId, questionId } },
        create: {
          ...baseData,
          answerStatus: "needs_review",
          answerText,
          answerSource,
          lastError: null,
        },
        update: {
          ...baseData,
          answerStatus: "needs_review",
          answerText,
          answerSource,
          lastError: null,
        },
      });
      queuedForReview++;
      details.push(`? #${questionId}: taslak hazır (güven ${pipeline.confidence.toFixed(2)}) — onay bekliyor`);
      continue;
    }

    const send = await answerTrendyolQuestion(creds, q.id, answerText);
    await prisma.trendyolQuestion.upsert({
      where: { siteId_questionId: { siteId, questionId } },
      create: {
        ...baseData,
        answerStatus: send.ok ? "sent" : "failed",
        answerText,
        answerSource,
        answeredAt: send.ok ? new Date() : null,
        lastError: send.ok ? null : send.message,
      },
      update: {
        ...baseData,
        answerStatus: send.ok ? "sent" : "failed",
        answerText,
        answerSource,
        answeredAt: send.ok ? new Date() : null,
        lastError: send.ok ? null : send.message,
      },
    });
    if (send.ok) {
      autoAnswered++;
      details.push(`✓ #${questionId}: otomatik cevaplandı (${answerSource})`);
    } else {
      failed++;
      details.push(`✗ #${questionId}: gönderilemedi — ${send.message}`);
    }
  }

  // Son çalışma zamanını yaz
  await prisma.marketplaceIntegration.update({
    where: { id: integration.id },
    data: { configJson: JSON.stringify({ ...config, lastQnaPullAt: new Date().toISOString() }) },
  });

  const message = `${fetchRes.questions.length} soru · ${autoAnswered} otomatik cevap · ${queuedForReview} onay kuyruğu · ${skipped} insana bırakıldı · ${failed} hata`;

  return {
    ok: true,
    fetched: fetchRes.questions.length,
    autoAnswered,
    queuedForReview,
    skipped,
    failed,
    message,
    details: details.slice(0, 40),
  };
}

function shouldRunNow(config: Record<string, string>, now = Date.now()): boolean {
  const minutes = Math.max(10, parseInt(config.qnaPullMinutes || "15", 10) || 15);
  const last = config.lastQnaPullAt ? new Date(config.lastQnaPullAt).getTime() : 0;
  return now - last >= minutes * 60 * 1000;
}

/** Cron: qnaAuto açık tüm Trendyol entegrasyonları için soru-cevap otomasyonu. */
export async function runScheduledTrendyolQna(options?: {
  force?: boolean;
  siteId?: string;
}): Promise<string[]> {
  const logs: string[] = [];
  const integrations = await prisma.marketplaceIntegration.findMany({
    where: {
      active: true,
      platform: "trendyol",
      ...(options?.siteId ? { siteId: options.siteId } : {}),
    },
  });

  for (const integration of integrations) {
    const config = parseConfig(integration.configJson);
    if (config.qnaAuto !== "true") {
      logs.push(`trendyol@${integration.siteId}: qnaAuto kapalı`);
      continue;
    }
    if (!options?.force && !shouldRunNow(config)) {
      logs.push(`trendyol@${integration.siteId}: atlandı (süre dolmadı)`);
      continue;
    }
    const result = await runTrendyolQnaAutomation({ siteId: integration.siteId, force: true });
    logs.push(`trendyol@${integration.siteId}: ${result.message}`);
  }

  return logs;
}

/** Admin panelden onaylanan tek bir taslağı Trendyol'a gönderir. */
export async function sendReviewedTrendyolAnswer(options: {
  siteId: string;
  recordId: string;
  overrideText?: string;
}): Promise<{ ok: boolean; message: string }> {
  const { siteId, recordId, overrideText } = options;
  const record = await prisma.trendyolQuestion.findFirst({
    where: { id: recordId, siteId },
  });
  if (!record) return { ok: false, message: "Kayıt bulunamadı." };
  if (record.answerStatus === "sent") {
    return { ok: false, message: "Bu soru zaten cevaplanmış." };
  }

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId, platform: "trendyol" },
  });
  const creds = integration ? parseTrendyolConfig(parseConfig(integration.configJson)) : null;
  if (!creds) return { ok: false, message: "Trendyol API bilgileri eksik." };

  const text = sanitizeQnaAnswer(overrideText ?? record.answerText ?? "");
  if (text.length < 10) return { ok: false, message: "Cevap en az 10 karakter olmalı." };

  const send = await answerTrendyolQuestion(creds, record.questionId, text);
  await prisma.trendyolQuestion.update({
    where: { id: record.id },
    data: {
      answerStatus: send.ok ? "sent" : "failed",
      answerText: text,
      answerSource: "manual",
      answeredAt: send.ok ? new Date() : null,
      lastError: send.ok ? null : send.message,
    },
  });
  return send;
}
