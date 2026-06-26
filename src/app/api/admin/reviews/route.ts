import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import {
  getReviewCounts,
  listAdminReviews,
  listProductsForReview,
} from "@/lib/admin/reviews/service";
import { createReview } from "@/lib/reviews/service";
import type { ReviewStatus } from "@/lib/reviews/service";

const REVIEW_PERM = "store.products";

function parseStatus(value: string | null): ReviewStatus | undefined {
  if (value === "pending" || value === "approved" || value === "rejected") return value;
  return undefined;
}

export async function GET(req: Request) {
  const auth = await requireStaffApi(REVIEW_PERM);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const status = parseStatus(url.searchParams.get("status"));

  const [reviews, counts, products] = await Promise.all([
    listAdminReviews(auth.siteId, { status }),
    getReviewCounts(auth.siteId),
    listProductsForReview(auth.siteId),
  ]);

  return NextResponse.json({ reviews, counts, products });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi(REVIEW_PERM);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek." }, { status: 400 });
  }

  const status = parseStatus(String(body.status ?? "approved")) ?? "approved";

  const result = await createReview({
    siteId: auth.siteId,
    productId: String(body.productId ?? ""),
    authorName: String(body.authorName ?? ""),
    authorEmail: body.authorEmail ? String(body.authorEmail) : null,
    rating: Number(body.rating),
    title: body.title ? String(body.title) : null,
    body: String(body.body ?? ""),
    source: "admin",
    status,
    isVerifiedPurchase: Boolean(body.isVerifiedPurchase),
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  revalidatePath("/products/[slug]", "page");
  return NextResponse.json({ ok: true, id: result.id, status: result.status });
}
