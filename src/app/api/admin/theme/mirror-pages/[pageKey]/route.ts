import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { clearDevMirrorHtmlCache } from "@/lib/mirror-html-build";
import { sanitizeMirrorPageConfig } from "@/lib/mirror-page-config-sanitize";
import { enrichMirrorPageConfigCollectionsTabs } from "@/lib/mirror-collections-tab-server";
import type { MirrorPageConfig } from "@/lib/mirror-home-overlay";
import { parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { getVitrinPage, isVitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { marqueePlainToHtml } from "@/lib/html-plain-text";

function syncMarqueeFromVitrinConfig(settings: SiteSettings, config: MirrorPageConfig): SiteSettings {
  const marqueeEdit = Object.values(config.elements ?? {}).find(
    (edit) => /--marquee-text--/.test(edit.id) && (edit.html?.trim() || edit.text?.trim()),
  );
  const marqueeHtml =
    marqueeEdit?.html?.trim() ||
    (marqueeEdit?.text?.trim() ? marqueePlainToHtml(marqueeEdit.text) : undefined) ||
    Object.values(config.sections ?? {})
      .map((section) => section?.marqueeHtml?.trim())
      .find(Boolean);
  if (!marqueeHtml) return settings;

  return {
    ...settings,
    theme: {
      ...settings.theme,
      defaultProductPageBottom: {
        ...settings.theme?.defaultProductPageBottom,
        marquee: {
          enabled: settings.theme?.defaultProductPageBottom?.marquee?.enabled ?? true,
          html: marqueeHtml,
        },
      },
      defaultProductMarqueeHtml: marqueeHtml,
    },
  };
}

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

  const sanitized = sanitizeMirrorPageConfig(pageKey, await req.json());
  if (!sanitized) return NextResponse.json({ error: "Geçersiz ayar" }, { status: 400 });
  const config = await enrichMirrorPageConfigCollectionsTabs(auth.siteId, sanitized);

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const settings = parseSiteSettings(site.settingsJson);
  const mergedSettings = syncMarqueeFromVitrinConfig(settings, config);
  mergedSettings.theme = {
    ...mergedSettings.theme,
    homepageMode: "mirror",
    mirrorPages: { ...mergedSettings.theme?.mirrorPages, [pageKey]: config },
    ...(pageKey === "home" ? { mirrorHome: config } : {}),
  };

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(mergedSettings) },
  });

  clearDevMirrorHtmlCache();

  const def = getVitrinPage(pageKey);
  if (def) revalidatePath(def.route);
  revalidateStorePublicCache(auth.siteId);

  return NextResponse.json({ ok: true, pageKey, config });
}
