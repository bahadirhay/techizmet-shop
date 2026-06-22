import { NextResponse } from "next/server";
import { listSocialContentDrafts } from "@/lib/admin/social-content/generate";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId")?.trim() || undefined;
  const drafts = await listSocialContentDrafts(auth.siteId, { productId });
  return NextResponse.json({ drafts });
}
