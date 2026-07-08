import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import {
  runTrendyolQnaAutomation,
  sendReviewedTrendyolAnswer,
} from "@/lib/marketplace/trendyol/qna-auto";

export const maxDuration = 300;

function trendyolQuestionReady(): boolean {
  const d = (prisma as unknown as Record<string, unknown>).trendyolQuestion as
    | { findMany?: unknown }
    | undefined;
  return Boolean(d && typeof d.findMany === "function");
}

/** Kuyruk + geçmiş + mevcut ayarlar */
export async function GET(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  if (!trendyolQuestionReady()) {
    return NextResponse.json({ error: "Soru tablosu hazır değil (deploy sonrası)." }, { status: 400 });
  }

  const status = new URL(req.url).searchParams.get("status")?.trim() || "";
  const where: Record<string, unknown> = { siteId: auth.siteId };
  if (status) where.answerStatus = status;

  const records = await prisma.trendyolQuestion.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId: auth.siteId, platform: "trendyol" },
    select: { configJson: true },
  });
  let config: Record<string, string> = {};
  try {
    config = JSON.parse(integration?.configJson ?? "{}") as Record<string, string>;
  } catch {
    config = {};
  }

  const counts = await prisma.trendyolQuestion.groupBy({
    by: ["answerStatus"],
    where: { siteId: auth.siteId },
    _count: { _all: true },
  });

  return NextResponse.json({
    ok: true,
    records: records.map((r) => ({
      id: r.id,
      questionId: r.questionId,
      questionText: r.questionText,
      customerName: r.customerName,
      productName: r.productName,
      productBarcode: r.productBarcode,
      tyStatus: r.tyStatus,
      answerStatus: r.answerStatus,
      answerText: r.answerText,
      answerSource: r.answerSource,
      confidence: r.confidence,
      lastError: r.lastError,
      askedAt: r.askedAt?.toISOString() ?? null,
      answeredAt: r.answeredAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    counts: Object.fromEntries(counts.map((c) => [c.answerStatus, c._count._all])),
    settings: {
      qnaAuto: config.qnaAuto === "true",
      qnaMode: config.qnaMode || "hybrid",
      qnaAutoThreshold: Number(config.qnaAutoThreshold) || 0.75,
    },
  });
}

/** action: run | send | discard | saveSettings */
export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  if (!trendyolQuestionReady()) {
    return NextResponse.json({ error: "Soru tablosu hazır değil (deploy sonrası)." }, { status: 400 });
  }

  let body: {
    action?: string;
    recordId?: string;
    text?: string;
    qnaAuto?: boolean;
    qnaMode?: string;
    qnaAutoThreshold?: number;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const action = body.action ?? "run";

  if (action === "run") {
    const result = await runTrendyolQnaAutomation({ siteId: auth.siteId, force: true });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (action === "send") {
    if (!body.recordId) {
      return NextResponse.json({ error: "recordId gerekli" }, { status: 400 });
    }
    const result = await sendReviewedTrendyolAnswer({
      siteId: auth.siteId,
      recordId: body.recordId,
      overrideText: body.text,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (action === "discard") {
    if (!body.recordId) {
      return NextResponse.json({ error: "recordId gerekli" }, { status: 400 });
    }
    await prisma.trendyolQuestion.updateMany({
      where: { id: body.recordId, siteId: auth.siteId },
      data: { answerStatus: "skipped", lastError: "Elle atlandı" },
    });
    return NextResponse.json({ ok: true, message: "Soru kuyruktan çıkarıldı." });
  }

  if (action === "saveSettings") {
    const integration = await prisma.marketplaceIntegration.findFirst({
      where: { siteId: auth.siteId, platform: "trendyol" },
    });
    if (!integration) {
      return NextResponse.json({ error: "Trendyol entegrasyonu bulunamadı" }, { status: 404 });
    }
    let config: Record<string, string> = {};
    try {
      config = JSON.parse(integration.configJson ?? "{}") as Record<string, string>;
    } catch {
      config = {};
    }
    if (body.qnaAuto != null) config.qnaAuto = body.qnaAuto ? "true" : "false";
    if (body.qnaMode) config.qnaMode = body.qnaMode;
    if (body.qnaAutoThreshold != null) config.qnaAutoThreshold = String(body.qnaAutoThreshold);
    await prisma.marketplaceIntegration.update({
      where: { id: integration.id },
      data: { configJson: JSON.stringify(config) },
    });
    return NextResponse.json({ ok: true, message: "Ayarlar kaydedildi." });
  }

  return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
}
