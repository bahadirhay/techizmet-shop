import { NextResponse } from "next/server";
import { testBlogAiProvider } from "@/lib/admin/blog-automation/ai-blog";
import { getSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import { requireStaffApi } from "@/lib/staff-auth";

export const maxDuration = 180;

export async function POST(req: Request) {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  let provider: "claude" | "gemini" | "openai" = "claude";
  try {
    const body = (await req.json()) as { provider?: string };
    if (body.provider === "gemini" || body.provider === "openai" || body.provider === "claude") {
      provider = body.provider;
    }
  } catch {
    /* default claude */
  }

  const config = await getSeoAiConfig(auth.siteId);
  const result = await testBlogAiProvider(config, provider);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 422 });
  }
  return NextResponse.json({ ok: true, message: result.message });
}
