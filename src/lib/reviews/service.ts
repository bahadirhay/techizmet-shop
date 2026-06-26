import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type ReviewStatus = "pending" | "approved" | "rejected";
export type ReviewSource = "customer" | "admin";

export type PublicReview = {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
};

export type ReviewStats = {
  count: number;
  average: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function hashIp(ip: string | null | undefined): string | null {
  const v = (ip ?? "").trim();
  if (!v) return null;
  return createHash("sha256").update(v).digest("hex").slice(0, 32);
}

export function clampRating(n: unknown): number {
  const r = Math.round(Number(n));
  if (!Number.isFinite(r)) return 0;
  return Math.min(5, Math.max(1, r));
}

export function emptyStats(): ReviewStats {
  return { count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
}

export async function getApprovedReviews(productId: string, limit = 30): Promise<PublicReview[]> {
  const rows = await prisma.storeProductReview.findMany({
    where: { productId, status: "approved" },
    orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      authorName: true,
      rating: true,
      title: true,
      body: true,
      isVerifiedPurchase: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    authorName: r.authorName,
    rating: clampRating(r.rating),
    title: r.title,
    body: r.body,
    isVerifiedPurchase: r.isVerifiedPurchase,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getReviewStats(productId: string): Promise<ReviewStats> {
  const rows = await prisma.storeProductReview.findMany({
    where: { productId, status: "approved" },
    select: { rating: true },
  });
  const stats = emptyStats();
  let sum = 0;
  for (const row of rows) {
    const k = clampRating(row.rating) as 1 | 2 | 3 | 4 | 5;
    if (k) {
      stats.distribution[k] += 1;
      sum += k;
    }
  }
  stats.count = rows.length;
  stats.average = stats.count ? Math.round((sum / stats.count) * 10) / 10 : 0;
  return stats;
}

/** Onaylı yorum istatistiklerini birden çok ürün için toplu döner (analiz/feed için) */
export async function getApprovedReviewCountsBySite(
  siteId: string,
): Promise<Map<string, { count: number; sum: number }>> {
  const grouped = await prisma.storeProductReview.groupBy({
    by: ["productId"],
    where: { siteId, status: "approved" },
    _count: { _all: true },
    _sum: { rating: true },
  });
  const map = new Map<string, { count: number; sum: number }>();
  for (const g of grouped) {
    map.set(g.productId, { count: g._count._all, sum: g._sum.rating ?? 0 });
  }
  return map;
}

export type CreateReviewInput = {
  siteId: string;
  productId: string;
  authorName: string;
  authorEmail?: string | null;
  rating: number;
  title?: string | null;
  body: string;
  source?: ReviewSource;
  status?: ReviewStatus;
  isVerifiedPurchase?: boolean;
  ipHash?: string | null;
};

export type CreateReviewResult =
  | { ok: true; id: string; status: ReviewStatus }
  | { ok: false; error: string };

const NAME_MAX = 80;
const TITLE_MAX = 120;
const BODY_MAX = 2000;
const BODY_MIN = 8;

export async function createReview(input: CreateReviewInput): Promise<CreateReviewResult> {
  const authorName = input.authorName.trim().slice(0, NAME_MAX);
  const body = input.body.trim().slice(0, BODY_MAX);
  const title = input.title?.trim().slice(0, TITLE_MAX) || null;
  const rating = clampRating(input.rating);

  if (!authorName) return { ok: false, error: "İsim gerekli." };
  if (!rating) return { ok: false, error: "1–5 arası puan verin." };
  if (body.length < BODY_MIN) return { ok: false, error: "Yorum çok kısa." };

  // Ürün bu siteye ait mi?
  const product = await prisma.storeProduct.findFirst({
    where: { id: input.productId, siteId: input.siteId },
    select: { id: true },
  });
  if (!product) return { ok: false, error: "Ürün bulunamadı." };

  const source: ReviewSource = input.source ?? "customer";
  const status: ReviewStatus = input.status ?? (source === "admin" ? "approved" : "pending");

  // Basit spam koruması — aynı IP son 1 saatte çok yorum atmasın (yalnızca müşteri)
  if (source === "customer" && input.ipHash) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.storeProductReview.count({
      where: { siteId: input.siteId, ipHash: input.ipHash, createdAt: { gte: since } },
    });
    if (recent >= 5) return { ok: false, error: "Çok fazla deneme. Lütfen sonra tekrar deneyin." };
  }

  const created = await prisma.storeProductReview.create({
    data: {
      siteId: input.siteId,
      productId: input.productId,
      authorName,
      authorEmail: input.authorEmail?.trim() || null,
      rating,
      title,
      body,
      status,
      source,
      isVerifiedPurchase: input.isVerifiedPurchase ?? false,
      ipHash: input.ipHash ?? null,
      approvedAt: status === "approved" ? new Date() : null,
    },
    select: { id: true, status: true },
  });

  return { ok: true, id: created.id, status: created.status as ReviewStatus };
}
