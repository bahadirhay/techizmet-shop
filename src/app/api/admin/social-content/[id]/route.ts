import { NextResponse } from "next/server";
import { updateSocialContentDraft } from "@/lib/admin/social-content/generate";
import { requireStaffApi } from "@/lib/staff-auth";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    title?: string | null;
    caption?: string | null;
    hook?: string | null;
    script?: string | null;
    body?: string | null;
    hashtags?: string[];
    cta?: string | null;
    status?: string;
    scheduledAt?: string | null;
  };

  const draft = await updateSocialContentDraft(auth.siteId, id, body);
  if (!draft) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ draft });
}
