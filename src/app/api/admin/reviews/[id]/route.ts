import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import {
  deleteReview,
  setReviewStatus,
  updateReview,
} from "@/lib/admin/reviews/service";
import type { ReviewStatus } from "@/lib/reviews/service";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";

const REVIEW_PERM = "store.products";

function revalidateProduct(siteId: string, slug: string | null) {
  revalidateStorePublicCache(siteId, slug ?? undefined);
  if (slug) revalidatePath(`/products/${slug}`);
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/collections/all");
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi(REVIEW_PERM);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek." }, { status: 400 });
  }

  const action = String(body.action ?? "");

  if (action === "approve" || action === "reject" || action === "pending") {
    const status: ReviewStatus =
      action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending";
    const res = await setReviewStatus(auth.siteId, id, status);
    if (!res.ok) return NextResponse.json({ ok: false, error: "Bulunamadı." }, { status: 404 });
    revalidateProduct(auth.siteId, res.slug);
    return NextResponse.json({ ok: true });
  }

  if (action === "update") {
    const res = await updateReview(auth.siteId, id, {
      authorName: body.authorName != null ? String(body.authorName) : undefined,
      rating: body.rating != null ? Number(body.rating) : undefined,
      title: body.title !== undefined ? (body.title ? String(body.title) : null) : undefined,
      body: body.body != null ? String(body.body) : undefined,
      isVerifiedPurchase:
        body.isVerifiedPurchase != null ? Boolean(body.isVerifiedPurchase) : undefined,
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: "Güncellenemedi." }, { status: 400 });
    revalidateProduct(auth.siteId, res.slug);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Geçersiz action." }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi(REVIEW_PERM);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const res = await deleteReview(auth.siteId, id);
  if (!res.ok) return NextResponse.json({ ok: false, error: "Bulunamadı." }, { status: 404 });
  revalidateProduct(auth.siteId, res.slug);
  return NextResponse.json({ ok: true });
}
