import { NextResponse } from "next/server";
import { getDefaultSite } from "@/lib/site";
import { createReview, hashIp } from "@/lib/reviews/service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek." }, { status: 400 });
  }

  const site = await getDefaultSite();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const result = await createReview({
    siteId: site.id,
    productId: String(body.productId ?? ""),
    authorName: String(body.authorName ?? ""),
    authorEmail: body.authorEmail ? String(body.authorEmail) : null,
    rating: Number(body.rating),
    title: body.title ? String(body.title) : null,
    body: String(body.body ?? ""),
    source: "customer",
    ipHash: hashIp(ip),
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json({ ok: true, status: result.status });
}
