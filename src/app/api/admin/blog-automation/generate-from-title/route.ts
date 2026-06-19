import { NextResponse } from "next/server";
import { getBlogAutomationConfig } from "@/lib/admin/blog-automation/settings";
import { BlogAiGenerationError } from "@/lib/admin/blog-automation/ai-blog";
import { createBlogPostFromTitle } from "@/lib/admin/blog-automation/run";
import { getDefaultSite } from "@/lib/site";
import { requireStaffApi } from "@/lib/staff-auth";

export const maxDuration = 180;

export async function POST(req: Request) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  let body: {
    title?: string;
    publish?: boolean;
    generateImage?: boolean;
    linkProducts?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
  }

  const site = await getDefaultSite();
  if (site.id !== auth.siteId) {
    return NextResponse.json({ error: "Site uyuşmazlığı" }, { status: 400 });
  }

  const config = await getBlogAutomationConfig(site.id);

  try {
    const result = await createBlogPostFromTitle({
      siteId: site.id,
      siteName: site.name,
      title,
      config,
      publish: body.publish,
      generateImage: body.generateImage,
      linkProducts: body.linkProducts,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.reason ?? "Üretim başarısız" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof BlogAiGenerationError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 422 });
    }
    const message = e instanceof Error ? e.message : "Üretim başarısız";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
