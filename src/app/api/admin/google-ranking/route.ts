import { NextResponse } from "next/server";
import { buildGoogleRankingSnapshot } from "@/lib/admin/google-ranking/scan";
import { syncGscQueries } from "@/lib/admin/gsc/sync";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const snapshot = await buildGoogleRankingSnapshot(auth.siteId);
  return NextResponse.json(snapshot);
}

/** GSC senkron + anlık snapshot */
export async function POST(req: Request) {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as { action?: string; days?: number };
  const action = body.action?.trim() || "sync-gsc";

  if (action === "sync-gsc") {
    const sync = await syncGscQueries(auth.siteId, {
      days: body.days ?? 28,
      force: true,
    });
    const snapshot = await buildGoogleRankingSnapshot(auth.siteId);
    if (!sync.ok) {
      return NextResponse.json({ ok: false, error: sync.error, snapshot }, { status: 400 });
    }
    return NextResponse.json({ ok: true, snapshot, sync });
  }

  return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
}
