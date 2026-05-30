/**
 * Techizmet Shop (theking-noor) logolarını uploads + StoreMedia + settingsJson.branding içine yazar.
 * Kullanım: npx tsx scripts/seed-site-branding.ts
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma";
import { mergeSiteSettings } from "../src/lib/merge-site-settings";
import { parseSiteSettings } from "../src/lib/site-settings";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const THEME_LOGOS = {
  dark: join(root, "public/theme/techizmet-shop/cdn/shop/files/noor-dark-logo34d3.svg"),
  light: join(root, "public/theme/techizmet-shop/cdn/shop/files/noor-white-logo34d3.svg"),
} as const;

const UPLOAD_NAMES = {
  dark: "techizmet-shop-logo-dark.svg",
  light: "techizmet-shop-logo-light.svg",
} as const;

async function ensureBrandingFile(
  siteId: string,
  srcPath: string,
  uploadName: string,
  label: string,
) {
  if (!existsSync(srcPath)) {
    throw new Error(`Logo dosyası bulunamadı (${label}): ${srcPath}\nÖnce: npm run theme:import`);
  }

  const relDir = join("uploads", "shop", siteId);
  const absDir = join(root, "public", relDir);
  mkdirSync(absDir, { recursive: true });

  const absFile = join(absDir, uploadName);
  copyFileSync(srcPath, absFile);

  const url = `/${relDir.replace(/\\/g, "/")}/${uploadName}`;
  const sizeBytes = statSync(absFile).size;

  const existing = await prisma.storeMedia.findFirst({
    where: { siteId, OR: [{ url }, { filename: uploadName }] },
  });

  if (existing) {
    return prisma.storeMedia.update({
      where: { id: existing.id },
      data: { url, filename: uploadName, mimeType: "image/svg+xml", sizeBytes },
    });
  }

  return prisma.storeMedia.create({
    data: {
      siteId,
      filename: uploadName,
      url,
      mimeType: "image/svg+xml",
      sizeBytes,
    },
  });
}

export async function seedSiteBranding(siteId?: string, opts?: { force?: boolean }) {
  const site =
    siteId != null
      ? await prisma.storeSite.findUnique({ where: { id: siteId } })
      : await prisma.storeSite.findFirst({ orderBy: { createdAt: "asc" } });

  if (!site) throw new Error("Mağaza (StoreSite) bulunamadı");

  const current = parseSiteSettings(site.settingsJson);
  const existingDark = current.branding?.logoUrl?.trim();
  const existingLight = current.branding?.logoUrlLight?.trim();
  const hasCustom =
    !opts?.force &&
    existingDark?.startsWith("/uploads/") &&
    existsSync(join(root, "public", existingDark.replace(/^\//, "")));

  if (hasCustom) {
    return {
      siteId: site.id,
      siteName: site.name,
      branding: current.branding,
      mediaIds: [] as string[],
      skipped: true as const,
    };
  }

  const darkMedia = await ensureBrandingFile(
    site.id,
    THEME_LOGOS.dark,
    UPLOAD_NAMES.dark,
    "koyu logo",
  );
  const lightMedia = await ensureBrandingFile(
    site.id,
    THEME_LOGOS.light,
    UPLOAD_NAMES.light,
    "açık logo",
  );

  const faviconUrl = "/favicon.ico";

  const settings = mergeSiteSettings(parseSiteSettings(site.settingsJson), {
    branding: {
      logoUrl: darkMedia.url,
      logoUrlLight: lightMedia.url,
      faviconUrl,
    },
  });

  await prisma.storeSite.update({
    where: { id: site.id },
    data: { settingsJson: JSON.stringify(settings) },
  });

  return {
    siteId: site.id,
    siteName: site.name,
    branding: settings.branding,
    mediaIds: [darkMedia.id, lightMedia.id],
    skipped: false as const,
  };
}

async function main() {
  const result = await seedSiteBranding();
  if (result.skipped) {
    console.log("[seed-site-branding] Atlandı — admin logosu korundu:", result.branding?.logoUrl);
    return;
  }
  console.log("[seed-site-branding] Tamam");
  console.log("  site:", result.siteName, `(${result.siteId})`);
  console.log("  logoUrl:", result.branding?.logoUrl);
  console.log("  logoUrlLight:", result.branding?.logoUrlLight);
  console.log("  StoreMedia:", result.mediaIds.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
