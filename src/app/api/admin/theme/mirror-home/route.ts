import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { sanitizeMirrorPageConfig } from "@/lib/mirror-page-config-sanitize";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

/** Ana sayfa — mirror-pages/home ile aynı */
export async function PATCH(req: Request) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const config = sanitizeMirrorPageConfig("home", await req.json());
  if (!config) return NextResponse.json({ error: "Geçersiz ayar" }, { status: 400 });

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const settings = parseSiteSettings(site.settingsJson);
  settings.theme = {
    ...settings.theme,
    homepageMode: "mirror",
    mirrorHome: config,
    mirrorPages: { ...settings.theme?.mirrorPages, home: config },
  };

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(settings) },
  });

  revalidatePath("/");
  return NextResponse.json({ ok: true, mirrorHome: config });
}
