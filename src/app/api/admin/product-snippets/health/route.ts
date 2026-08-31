import { NextResponse } from "next/server";
import { runProductSnippetHealthCheck } from "@/lib/admin/product-snippets/health";
import { requireStaffApi } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await runProductSnippetHealthCheck();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tarama başarısız" },
      { status: 500 },
    );
  }
}
