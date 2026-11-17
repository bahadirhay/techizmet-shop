import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { findLandingContent } from "@/lib/seo/landing-content";
import { findLandingIntentBySlug } from "@/lib/seo/search-intent";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

type LandingOverlay = {
  heading?: string;
  heroLead?: string;
  intro?: string[];
  ctaLabel?: string;
  heroImageUrl?: string;
};

function cleanSlug(raw: string): string {
  return decodeURIComponent(raw).trim().toLowerCase();
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const { slug: raw } = await ctx.params;
  const slug = cleanSlug(raw);
  const intent = findLandingIntentBySlug(slug);
  if (!intent) {
    return NextResponse.json({ error: "Landing bulunamadı" }, { status: 404 });
  }

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const settings = parseSiteSettings(site.settingsJson);
  const overlay = settings.seo?.landingPages?.[slug] ?? {};
  const def = findLandingContent(slug);

  return NextResponse.json({
    slug,
    route: `/collections/${slug}`,
    defaults: {
      heading: intent.h1 ?? intent.query,
      heroLead: def?.heroLead ?? "",
      intro: def?.intro ?? [intent.description],
      ctaLabel: "Ürünleri gör",
      heroImageUrl: "",
    },
    overlay,
    effective: {
      heading: overlay.heading?.trim() || intent.h1 || intent.query,
      heroLead: overlay.heroLead?.trim() || def?.heroLead || "",
      intro:
        overlay.intro && overlay.intro.length
          ? overlay.intro
          : def?.intro ?? [intent.description],
      ctaLabel: overlay.ctaLabel?.trim() || "Ürünleri gör",
      heroImageUrl: overlay.heroImageUrl?.trim() || "",
    },
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const { slug: raw } = await ctx.params;
  const slug = cleanSlug(raw);
  const intent = findLandingIntentBySlug(slug);
  if (!intent) {
    return NextResponse.json({ error: "Landing bulunamadı" }, { status: 404 });
  }

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const body = (await req.json()) as LandingOverlay;
  const current = parseSiteSettings(site.settingsJson);

  const intro =
    Array.isArray(body.intro)
      ? body.intro.map((p) => String(p).trim()).filter(Boolean)
      : undefined;

  const nextOverlay: LandingOverlay = {
    heading: body.heading?.trim() || undefined,
    heroLead: body.heroLead?.trim() || undefined,
    intro: intro && intro.length ? intro : undefined,
    ctaLabel: body.ctaLabel?.trim() || undefined,
    heroImageUrl: body.heroImageUrl?.trim() || undefined,
  };

  // Boş alanları yazma — kod varsayılanına dönsün
  const cleaned: LandingOverlay = {};
  if (nextOverlay.heading) cleaned.heading = nextOverlay.heading;
  if (nextOverlay.heroLead) cleaned.heroLead = nextOverlay.heroLead;
  if (nextOverlay.intro?.length) cleaned.intro = nextOverlay.intro;
  if (nextOverlay.ctaLabel) cleaned.ctaLabel = nextOverlay.ctaLabel;
  if (nextOverlay.heroImageUrl) cleaned.heroImageUrl = nextOverlay.heroImageUrl;

  const landingPages = { ...(current.seo?.landingPages ?? {}) };
  if (Object.keys(cleaned).length === 0) {
    delete landingPages[slug];
  } else {
    landingPages[slug] = cleaned;
  }

  // mergeSiteSettings landingPages'i deep-merge eder; silinen slug geri gelmesin diye
  // burada doğrudan yazıyoruz.
  const next = {
    ...current,
    seo: {
      ...current.seo,
      landingPages,
    },
  };

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(next) },
  });

  revalidateStorePublicCache(auth.siteId);
  revalidatePath(`/collections/${slug}`);
  revalidatePath("/admin/pages");

  return NextResponse.json({ ok: true, overlay: cleaned });
}
