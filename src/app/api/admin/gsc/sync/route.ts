import { NextResponse } from "next/server";
import { syncGscQueries } from "@/lib/admin/gsc/sync";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  let days = 7;
  try {
    const body = (await req.json()) as { days?: number };
    if (body.days) days = body.days;
  } catch {
    // body optional
  }

  const result = await syncGscQueries(auth.siteId, { days, force: true });
  if (!result.ok && !result.skipped) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
