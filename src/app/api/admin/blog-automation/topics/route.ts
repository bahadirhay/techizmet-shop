import { NextResponse } from "next/server";
import { getBlogAutomationConfig } from "@/lib/admin/blog-automation/settings";
import { collectBlogTopicCandidates } from "@/lib/admin/blog-automation/topics";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? "7") || 7));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);

  const config = await getBlogAutomationConfig(auth.siteId);
  const topics = await collectBlogTopicCandidates(auth.siteId, config, { from, to, limit });

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    topics,
  });
}
