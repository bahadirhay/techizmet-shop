import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import type { ProductPageBottomSettings } from "@/lib/product-page-bottom";
import {
  getDefaultProductExploreLooks,
  getProductPageBottomSettings,
  parseSiteSettings,
  type SiteSettings,
} from "@/lib/site-settings";
import type { ProductExploreLook } from "@/lib/product-explore-looks";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function cleanLooks(raw: unknown): ProductExploreLook[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is ProductExploreLook => x && typeof x.imageUrl === "string" && x.imageUrl.trim())
    .map((x) => ({
      imageUrl: x.imageUrl.trim(),
      label: String(x.label ?? "EXPLORE").trim() || "EXPLORE",
      productSlugs: Array.isArray(x.productSlugs)
        ? x.productSlugs.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        : [],
    }));
}

function cleanBottom(raw: unknown): ProductPageBottomSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const marquee = o.marquee as Record<string, unknown> | undefined;
  const revealing = o.revealingText as Record<string, unknown> | undefined;
  const video = o.videoPromo as Record<string, unknown> | undefined;
  if (!marquee || !revealing || !video) return null;

  return {
    marquee: {
      enabled: Boolean(marquee.enabled),
      html: String(marquee.html ?? "").trim(),
    },
    revealingText: {
      enabled: Boolean(revealing.enabled),
      html: String(revealing.html ?? "").trim(),
    },
    videoPromo: {
      enabled: Boolean(video.enabled),
      headingHtml: String(video.headingHtml ?? "").trim(),
      descriptionHtml: String(video.descriptionHtml ?? "").trim(),
    },
  };
}

function validateBottom(bottom: ProductPageBottomSettings): string | null {
  if (bottom.marquee.enabled && !bottom.marquee.html) return "Kayan yazı açıkken metin gerekli";
  if (bottom.revealingText.enabled && !bottom.revealingText.html) {
    return "Açılış metni açıkken metin gerekli";
  }
  if (bottom.videoPromo.enabled) {
    if (!bottom.videoPromo.headingHtml) return "Video başlığı açıkken başlık gerekli";
    if (!bottom.videoPromo.descriptionHtml) return "Video başlığı açıkken açıklama gerekli";
  }
  return null;
}

function requireProductPageBottomPerm(auth: { permissions: string[] }) {
  if (
    auth.permissions.includes("content.pages") ||
    auth.permissions.includes("store.products") ||
    auth.permissions.includes("site.settings")
  ) {
    return null;
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET() {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;
  const denied = requireProductPageBottomPerm(auth);
  if (denied) return denied;
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });
  const settings = parseSiteSettings(site.settingsJson);
  return NextResponse.json({
    looks: getDefaultProductExploreLooks(settings),
    pageBottom: getProductPageBottomSettings(settings),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;
  const denied = requireProductPageBottomPerm(auth);
  if (denied) return denied;
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const body = (await req.json()) as { looks?: unknown; pageBottom?: unknown };
  const looks = cleanLooks(body.looks);
  if (!looks.length) {
    return NextResponse.json({ error: "En az bir Keşfet kartı (görsel) gerekli" }, { status: 400 });
  }

  const pageBottom = cleanBottom(body.pageBottom);
  if (!pageBottom) {
    return NextResponse.json({ error: "Sayfa altı ayarları geçersiz" }, { status: 400 });
  }
  const bottomErr = validateBottom(pageBottom);
  if (bottomErr) return NextResponse.json({ error: bottomErr }, { status: 400 });

  const current = parseSiteSettings(site.settingsJson);
  const next = mergeSiteSettings(current, {
    theme: {
      ...current.theme,
      defaultProductExploreLooks: looks,
      defaultProductPageBottom: pageBottom,
      defaultProductMarqueeHtml: pageBottom.marquee.html,
    } satisfies SiteSettings["theme"],
  });

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(next) },
  });

  revalidatePath("/products/[slug]", "page");
  revalidateStorePublicCache(auth.siteId);

  return NextResponse.json({ ok: true, looks, pageBottom });
}
