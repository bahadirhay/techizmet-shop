import { NextResponse } from "next/server";
import {
  createBlogPostForProduct,
  generateMissingProductBlogs,
} from "@/lib/admin/blog-automation/product-blogs";
import { getDefaultSite } from "@/lib/site";
import { requireStaffApi } from "@/lib/staff-auth";

export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  let body: {
    productId?: string;
    limit?: number;
    publish?: boolean;
    force?: boolean;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const site = await getDefaultSite();
  if (site.id !== auth.siteId) {
    return NextResponse.json({ error: "Site uyuşmazlığı" }, { status: 400 });
  }

  const publish = body.publish === true;

  try {
    if (body.productId?.trim()) {
      const result = await createBlogPostForProduct({
        siteId: site.id,
        siteName: site.name,
        productId: body.productId.trim(),
        force: body.force === true,
        publish,
      });
      return NextResponse.json(result);
    }

    const result = await generateMissingProductBlogs({
      siteId: site.id,
      siteName: site.name,
      limit: body.limit,
      publish,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Üretim başarısız";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
