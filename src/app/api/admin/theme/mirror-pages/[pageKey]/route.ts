import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { sanitizeMirrorPageConfig } from "@/lib/mirror-page-config-sanitize";
import { parseSiteSettings } from "@/lib/site-settings";
import { getVitrinPage, isVitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ pageKey: string }> },
) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const { pageKey } = await ctx.params;
  if (!isVitrinPageKey(pageKey)) {
    return NextResponse.json({ error: "Geçersiz sayfa" }, { status: 400 });
  }

  const config = sanitizeMirrorPageConfig(pageKey, await req.json());
  if (!config) return NextResponse.json({ error: "Geçersiz ayar" }, { status: 400 });

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const settings = parseSiteSettings(site.settingsJson);
  settings.theme = {
    ...settings.theme,
    homepageMode: "mirror",
    mirrorPages: { ...settings.theme?.mirrorPages, [pageKey]: config },
    ...(pageKey === "home" ? { mirrorHome: config } : {}),
  };

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(settings) },
  });

  const def = getVitrinPage(pageKey);
  if (def) revalidatePath(def.route);

  return NextResponse.json({ ok: true, pageKey, config });
}
