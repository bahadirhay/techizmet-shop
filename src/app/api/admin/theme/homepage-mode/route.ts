import { NextResponse } from "next/server";
import { parseSiteSettings, type HomepageMode } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { mode?: string };
  const mode: HomepageMode = body.mode === "blocks" ? "blocks" : "mirror";

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const settings = parseSiteSettings(site.settingsJson);
  settings.theme = { ...settings.theme, homepageMode: mode };

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(settings) },
  });

  return NextResponse.json({ ok: true, homepageMode: mode });
}
