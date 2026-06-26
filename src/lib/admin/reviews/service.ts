import "server-only";

import { prisma } from "@/lib/prisma";
import { clampRating, type ReviewStatus } from "@/lib/reviews/service";

export type AdminReviewRow = {
  id: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  authorName: string;
  authorEmail: string | null;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  source: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  approvedAt: string | null;
};

export type AdminReviewCounts = {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
};

const STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];

export async function getReviewCounts(siteId: string): Promise<AdminReviewCounts> {
  const grouped = await prisma.storeProductReview.groupBy({
    by: ["status"],
    where: { siteId },
    _count: { _all: true },
  });
  const counts: AdminReviewCounts = { pending: 0, approved: 0, rejected: 0, total: 0 };
  for (const g of grouped) {
    const n = g._count._all;
    counts.total += n;
    if (g.status === "pending") counts.pending = n;
    else if (g.status === "approved") counts.approved = n;
    else if (g.status === "rejected") counts.rejected = n;
  }
  return counts;
}

export async function listAdminReviews(
  siteId: string,
  opts?: { status?: ReviewStatus; limit?: number },
): Promise<AdminReviewRow[]> {
  const rows = await prisma.storeProductReview.findMany({
    where: {
      siteId,
      ...(opts?.status ? { status: opts.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 200,
    select: {
      id: true,
      productId: true,
      authorName: true,
      authorEmail: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      source: true,
      isVerifiedPurchase: true,
      createdAt: true,
      approvedAt: true,
      product: { select: { title: true, slug: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    productTitle: r.product?.title ?? "(silinmiş ürün)",
    productSlug: r.product?.slug ?? "",
    authorName: r.authorName,
    authorEmail: r.authorEmail,
    rating: clampRating(r.rating),
    title: r.title,
    body: r.body,
    status: r.status as ReviewStatus,
    source: r.source,
    isVerifiedPurchase: r.isVerifiedPurchase,
    createdAt: r.createdAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
  }));
}

/** Manuel ekleme için yayında olan ürünler */
export async function listProductsForReview(
  siteId: string,
): Promise<{ id: string; title: string }[]> {
  const rows = await prisma.storeProduct.findMany({
    where: { siteId, published: true },
    orderBy: { title: "asc" },
    take: 1000,
    select: { id: true, title: true },
  });
  return rows;
}

async function productSlugFor(siteId: string, reviewId: string): Promise<string | null> {
  const row = await prisma.storeProductReview.findFirst({
    where: { id: reviewId, siteId },
    select: { product: { select: { slug: true } } },
  });
  return row?.product?.slug ?? null;
}

export async function setReviewStatus(
  siteId: string,
  reviewId: string,
  status: ReviewStatus,
): Promise<{ ok: boolean; slug: string | null }> {
  if (!STATUSES.includes(status)) return { ok: false, slug: null };
  const slug = await productSlugFor(siteId, reviewId);
  const result = await prisma.storeProductReview.updateMany({
    where: { id: reviewId, siteId },
    data: { status, approvedAt: status === "approved" ? new Date() : null },
  });
  return { ok: result.count > 0, slug };
}

export type UpdateReviewFields = {
  authorName?: string;
  rating?: number;
  title?: string | null;
  body?: string;
  isVerifiedPurchase?: boolean;
};

export async function updateReview(
  siteId: string,
  reviewId: string,
  fields: UpdateReviewFields,
): Promise<{ ok: boolean; slug: string | null }> {
  const slug = await productSlugFor(siteId, reviewId);
  const data: Record<string, unknown> = {};
  if (typeof fields.authorName === "string") data.authorName = fields.authorName.trim().slice(0, 80);
  if (fields.rating != null) data.rating = clampRating(fields.rating);
  if (fields.title !== undefined) data.title = fields.title?.trim().slice(0, 120) || null;
  if (typeof fields.body === "string") data.body = fields.body.trim().slice(0, 2000);
  if (typeof fields.isVerifiedPurchase === "boolean")
    data.isVerifiedPurchase = fields.isVerifiedPurchase;
  if (Object.keys(data).length === 0) return { ok: false, slug };
  const result = await prisma.storeProductReview.updateMany({
    where: { id: reviewId, siteId },
    data,
  });
  return { ok: result.count > 0, slug };
}

export async function deleteReview(
  siteId: string,
  reviewId: string,
): Promise<{ ok: boolean; slug: string | null }> {
  const slug = await productSlugFor(siteId, reviewId);
  const result = await prisma.storeProductReview.deleteMany({ where: { id: reviewId, siteId } });
  return { ok: result.count > 0, slug };
}
