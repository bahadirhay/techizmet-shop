import { NextResponse } from "next/server";
import { publishSocialContentDraft, scheduleSocialContentDraft } from "@/lib/social-publish/publish-draft";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { scheduledAt?: string | null };

  if (body.scheduledAt) {
    const at = new Date(body.scheduledAt);
    if (Number.isNaN(at.getTime())) {
      return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
    }
    const scheduled = await scheduleSocialContentDraft(auth.siteId, id, at);
    if (!scheduled.ok) {
      return NextResponse.json({ error: scheduled.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, scheduled: true, scheduledAt: at.toISOString() });
  }

  const result = await publishSocialContentDraft(auth.siteId, id);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, manualOnly: result.manualOnly, platform: result.platform },
      { status: result.manualOnly ? 422 : 500 },
    );
  }
  return NextResponse.json(result);
}
