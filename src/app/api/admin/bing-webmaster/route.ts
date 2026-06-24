import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { scanBingWebmaster } from "@/lib/admin/bing-webmaster/scan";
import { runSeoDashboardFix } from "@/lib/admin/seo-dashboard/fix";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { revalidateSearchDiscoveryPaths, runDistributionIndexPass } from "@/lib/seo/distribution-runner";
import { patchDistributionChecklistItem } from "@/lib/seo/distribution-settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const scan = await scanBingWebmaster(auth.siteId);
  return NextResponse.json(scan);
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const body = (await req.json()) as {
    action?: "run-indexing" | "fix-meta" | "save-bing-verification" | "mark-backlinks-noted";
    bingVerification?: string;
  };

  const settings = parseSiteSettings(site.settingsJson);

  if (body.action === "save-bing-verification") {
    const code = body.bingVerification?.trim() ?? "";
    const next = mergeSiteSettings(settings, {
      seo: { ...settings.seo, bingVerification: code },
    });
    await prisma.storeSite.update({
      where: { id: auth.siteId },
      data: { settingsJson: JSON.stringify(next) },
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, scan: await scanBingWebmaster(auth.siteId) });
  }

  if (body.action === "mark-backlinks-noted") {
    const next = patchDistributionChecklistItem(settings, "bing-webmaster-backlinks", {
      status: "done",
      doneAt: new Date().toISOString(),
      notes: "Admin panelden işaretlendi",
    });
    await prisma.storeSite.update({
      where: { id: auth.siteId },
      data: { settingsJson: JSON.stringify(next) },
    });
    return NextResponse.json({ ok: true, scan: await scanBingWebmaster(auth.siteId) });
  }

  if (body.action === "run-indexing") {
    const result = await runDistributionIndexPass(auth.siteId, settings);
    const next = mergeSiteSettings(settings, {
      seo: { ...settings.seo, distribution: result.distribution },
    });
    await prisma.storeSite.update({
      where: { id: auth.siteId },
      data: { settingsJson: JSON.stringify(next) },
    });
    revalidateSearchDiscoveryPaths();
    return NextResponse.json({
      ok: result.ok,
      indexing: result,
      scan: await scanBingWebmaster(auth.siteId),
    });
  }

  if (body.action === "fix-meta") {
    const pageFix = await runSeoDashboardFix(auth.siteId, { target: "pages", limit: 20 });
    let productProcessed = 0;
    let productSucceeded = 0;
    const productDetails: string[] = [];
    const productErrors: string[] = [];

    for (let batch = 0; batch < 20; batch++) {
      const batchResult = await runSeoDashboardFix(auth.siteId, { target: "products", limit: 5 });
      productProcessed += batchResult.processed;
      productSucceeded += batchResult.succeeded;
      productDetails.push(...batchResult.details);
      productErrors.push(...batchResult.errors);
      if (batchResult.processed === 0 || batchResult.remaining === 0) break;
    }

    revalidateSearchDiscoveryPaths();
    return NextResponse.json({
      ok: pageFix.failed === 0 && productErrors.length === 0,
      fix: {
        pages: pageFix,
        products: {
          processed: productProcessed,
          succeeded: productSucceeded,
          details: productDetails,
          errors: productErrors,
        },
      },
      scan: await scanBingWebmaster(auth.siteId),
    });
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
}
