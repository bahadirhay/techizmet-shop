/**
 * Yeni, boş e-ticaret mağazası — ayrı Neon/PostgreSQL veritabanında çalıştırın.
 *
 * Örnek (Anatolian Paw):
 *   copy .env.anatolianpaw.example .env.anatolianpaw
 *   # DATABASE_URL ve ADMIN_PASSWORD doldurun
 *   npm run store:provision -- --env-file=.env.anatolianpaw --slug=anatolianpaw --name="Anatolian Paw" --url=https://anatolianpaw.com
 *
 * Sonra aynı env ile: npm run dev  (veya STORE_SITE_SLUG + DATABASE_URL ile deploy)
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { buildEmptyStoreHomePreset } from "../src/lib/blocks/presets/empty-store-home";
import { serializeBlocks } from "../src/lib/blocks/schema";
import { resolveNavMenuHref } from "../src/lib/nav-menu-link";
import { allStaffPermissions } from "../src/lib/staff-permissions";
import type { HomepageMode } from "../src/lib/site-settings";
import {
  buildAnatolianPawStoreSettings,
  buildEmptyStoreSettings,
  EMPTY_STORE_HEADER_MENU,
} from "../src/lib/store-provision-template";
import { ensureLegalCmsPages } from "../src/lib/ensure-legal-cms-pages";

function argValue(flag: string): string | undefined {
  const hit = process.argv.find((a) => a === flag || a.startsWith(`${flag}=`));
  if (!hit) return undefined;
  if (hit.includes("=")) return hit.slice(hit.indexOf("=") + 1).trim() || undefined;
  const i = process.argv.indexOf(hit);
  return process.argv[i + 1]?.trim();
}

function loadEnvFile() {
  const envFile = argValue("--env-file") ?? ".env";
  const root = process.cwd();
  config({ path: resolve(root, envFile) });
  if (envFile !== ".env") {
    config({ path: resolve(root, ".env.local"), override: true });
  } else {
    config({ path: resolve(root, ".env.local"), override: true });
  }
}

const SLUG_RE = /^[a-z]([a-z0-9-]*)[a-z0-9]$/;

async function main() {
  loadEnvFile();

  const slug = (argValue("--slug") ?? "anatolianpaw").toLowerCase();
  const name = argValue("--name") ?? "Anatolian Paw";
  const publicUrl = argValue("--url") ?? process.env.NEXT_PUBLIC_STORE_URL ?? "";
  const adminUser = argValue("--admin-user") ?? "admin";
  const locale = argValue("--locale") === "en" ? "en" : "tr";
  const force = process.argv.includes("--force");
  const mirror = process.argv.includes("--mirror");
  const preset = argValue("--preset")?.toLowerCase();
  const metaDescription = argValue("--meta-description");

  let homepageMode: HomepageMode = mirror ? "mirror" : "blocks";

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL tanımlı değil (--env-file ile doğru .env dosyasını verin).");
  }
  if (slug.length < 2 || slug.length > 64 || !SLUG_RE.test(slug)) {
    throw new Error("Geçersiz --slug (küçük harf, rakam, tire; 2–64 karakter).");
  }

  const plain = process.env.ADMIN_PASSWORD?.trim();
  if (!plain || plain.length < 8) {
    throw new Error("ADMIN_PASSWORD en az 8 karakter olmalı (.env dosyasında).");
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.storeSite.findUnique({ where: { slug } });
    if (existing && !force) {
      throw new Error(
        `slug="${slug}" zaten var. Üzerine yazmak için --force ekleyin (tüm site verisi silinir).`,
      );
    }

    if (existing && force) {
      console.log(`[provision] Mevcut site siliniyor: ${slug}`);
      await prisma.storeSite.delete({ where: { id: existing.id } });
    }

    const settings =
      preset === "anatolianpaw"
        ? buildAnatolianPawStoreSettings(publicUrl || undefined)
        : buildEmptyStoreSettings({
            siteName: name,
            publicUrl: publicUrl || undefined,
            locale,
            homepageMode,
            metaDescription: metaDescription || undefined,
          });

    if (preset === "anatolianpaw") {
      homepageMode = "mirror";
    }

    const site = await prisma.storeSite.create({
      data: {
        slug,
        name,
        currency: "TRY",
        locale,
        themeId: "techizmet-shop",
        settingsJson: JSON.stringify(settings),
      },
    });

    const perms = JSON.stringify(allStaffPermissions());
    const adminRole = await prisma.shopStaffRole.create({
      data: {
        siteId: site.id,
        slug: "admin",
        label: "Yönetici",
        permissionsJson: perms,
      },
    });

    const hash = await bcrypt.hash(plain, 12);
    await prisma.shopStaffUser.create({
      data: {
        siteId: site.id,
        username: adminUser,
        passwordHash: hash,
        displayName: "Yönetici",
        active: true,
        roleAssignments: { create: [{ roleId: adminRole.id }] },
      },
    });

    const homeBlocks = serializeBlocks(buildEmptyStoreHomePreset(locale, name));
    for (const page of [
      { slug: "home", title: locale === "tr" ? "Ana Sayfa" : "Home", blocks: homeBlocks },
      {
        slug: "about",
        title: locale === "tr" ? "Hakkımızda" : "About",
        blocks: serializeBlocks([
          {
            type: "text",
            props: {
              as: "h1",
              align: "center",
              content: locale === "tr" ? "Hakkımızda" : "About us",
            },
          },
          {
            type: "text",
            props: {
              align: "center",
              content: `${name} — ${locale === "tr" ? "içerik panelden düzenlenecek." : "content editable from admin."}`,
            },
          },
        ]),
      },
      {
        slug: "contact",
        title: locale === "tr" ? "İletişim" : "Contact",
        blocks: serializeBlocks([
          {
            type: "text",
            props: {
              as: "h1",
              align: "center",
              content: locale === "tr" ? "İletişim" : "Contact",
            },
          },
          {
            type: "text",
            props: {
              align: "center",
              content:
                locale === "tr"
                  ? "E-posta ve adres bilgilerini Ayarlar bölümünden ekleyin."
                  : "Add email and address in Settings.",
            },
          },
        ]),
      },
    ]) {
      await prisma.shopPage.create({
        data: {
          siteId: site.id,
          slug: page.slug,
          title: page.title,
          blocks: page.blocks,
          published: true,
        },
      });
    }

    let order = 0;
    for (const item of EMPTY_STORE_HEADER_MENU) {
      await prisma.navMenuItem.create({
        data: {
          siteId: site.id,
          menuSlug: "header",
          labelTr: item.labelTr,
          labelEn: item.labelEn,
          linkType: item.linkType,
          linkTarget: item.linkTarget,
          href: resolveNavMenuHref(item.linkType, item.linkTarget, "/"),
          sortOrder: order++,
          published: true,
        },
      });
    }

    await ensureLegalCmsPages(site.id);

    console.log("");
    console.log("=== Mağaza hazır (boş vitrin) ===");
    console.log(`  Site slug     : ${slug}`);
    console.log(`  Site adı      : ${name}`);
    console.log(`  Site id       : ${site.id}`);
    console.log(`  Vitrin modu   : ${homepageMode}`);
    console.log(`  Tema paketi   : techizmet-shop (içerik panelden değişir)`);
    console.log(`  Ürün sayısı   : 0`);
    console.log(`  Admin kullanıcı: ${adminUser}`);
    console.log(`  Admin şifre   : (ADMIN_PASSWORD — .env dosyanızda)`);
    console.log("");
    console.log("Sonraki adımlar:");
    console.log(`  1. .env içinde STORE_SITE_SLUG=${slug}`);
    console.log(`  2. NEXT_PUBLIC_STORE_URL=${publicUrl || "http://localhost:5555"}`);
    console.log("  3. npm run dev  →  /admin");
    console.log("  4. Admin → Logo & SEO, Ana Sayfa, Ürünler / kategoriler");
    if (homepageMode === "mirror") {
      console.log("  5. Mirror vitrin: logo/menü Ayarlar'dan; metinler Ana Sayfa editöründen");
    }
    console.log("");
    console.log("Canlı (anatolianpaw.com): ayrı Vercel projesi + bu DATABASE_URL + alan adı DNS.");
    console.log("");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
