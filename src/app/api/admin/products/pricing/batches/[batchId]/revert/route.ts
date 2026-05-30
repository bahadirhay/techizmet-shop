import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { revertBulkPricingBatch } from "@/lib/bulk-pricing";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ batchId: string }> },
) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const { batchId } = await ctx.params;
  const result = await revertBulkPricingBatch(auth.siteId, batchId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Geri alınamadı" }, { status: 400 });
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/pricing");
  revalidatePath("/");

  return NextResponse.json({ ok: true });
}
