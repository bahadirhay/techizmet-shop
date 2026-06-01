import { config } from "dotenv";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { buildStoreHomePreset } from "../src/lib/blocks/presets/techizmet-shop-home";
import { MIRROR_COLLECTIONS, MIRROR_COLLECTION_LIST } from "../src/lib/catalog/mirror-catalog";
import {
  MIRROR_PRODUCT_COLLECTIONS,
  MIRROR_PRODUCT_VARIANTS,
  mirrorPrimaryCollectionSlug,
  mirrorProductSlugsForSeed,
  mirrorSeedImageUrl,
} from "../src/lib/catalog/mirror-seed";
import { serializeBlocks } from "../src/lib/blocks/schema";
import { ensureDefaultStaffRoles } from "../src/lib/staff-role-presets";
import { SHIPPING_CARRIER_PRESETS } from "../src/lib/admin/marketplace-platforms";
import { serializeProductBadges } from "../src/lib/product-badges";
import { DEFAULT_STORE_NAV } from "../src/lib/store-navigation";
import { seedVitrinHeaderMenu } from "../src/lib/nav-menu-seed";

const DEFAULT_SETTINGS = {
  theme: { homepageMode: "mirror", navItems: DEFAULT_STORE_NAV },
  branding: {
    logoUrl: "/theme/techizmet-shop/cdn/shop/files/noor-dark-logo34d3.svg",
    logoUrlLight: "/theme/techizmet-shop/cdn/shop/files/noor-white-logo34d3.svg",
    faviconUrl: "/favicon.ico",
  },
  payment: { codEnabled: true, bankTransferEnabled: true },
  store: { freeShippingOverMinor: 30000 },
};

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

async function main() {
  const site = await prisma.storeSite.upsert({
    where: { slug: "demo" },
    create: {
      slug: "demo",
      name: "Techizmet Shop Demo",
      currency: "TRY",
      locale: "tr",
      themeId: "techizmet-shop",
      settingsJson: JSON.stringify(DEFAULT_SETTINGS),
    },
    update: {
      name: "Techizmet Shop Demo",
      themeId: "techizmet-shop",
      settingsJson: JSON.stringify(DEFAULT_SETTINGS),
    },
  });

  await ensureDefaultStaffRoles(prisma, site.id);
  const adminRole = await prisma.shopStaffRole.findUniqueOrThrow({
    where: { siteId_slug: { siteId: site.id, slug: "admin" } },
  });

  const plain = process.env.ADMIN_PASSWORD?.trim() || "admin123";
  const hash = await bcrypt.hash(plain, 12);
  await prisma.shopStaffUser.upsert({
    where: { siteId_username: { siteId: site.id, username: "admin" } },
    create: {
      siteId: site.id,
      username: "admin",
      passwordHash: hash,
      displayName: "Yönetici",
      active: true,
      roleAssignments: { create: [{ roleId: adminRole.id }] },
    },
    update: {
      passwordHash: hash,
      active: true,
      roleAssignments: { deleteMany: {}, create: [{ roleId: adminRole.id }] },
    },
  });

  await prisma.shopPage.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "home" } },
    create: {
      siteId: site.id,
      slug: "home",
      title: "Ana Sayfa",
      blocks: serializeBlocks(buildStoreHomePreset("tr")),
      published: true,
    },
    update: { blocks: serializeBlocks(buildStoreHomePreset("tr")) },
  });

  await prisma.shopPage.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "about" } },
    create: {
      siteId: site.id,
      slug: "about",
      title: "Hakkımızda",
      blocks: serializeBlocks([
        { type: "text", props: { content: "Hakkımızda", as: "h1", align: "center" } },
        {
          type: "text",
          props: {
            content: "Techizmet Shop — Techizmet Shop referans teması ile e-ticaret vitrini.",
            align: "center",
          },
        },
      ]),
      published: true,
    },
    update: {},
  });

  await prisma.shopPage.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "mesafeli-satis" } },
    create: {
      siteId: site.id,
      slug: "mesafeli-satis",
      title: "Mesafeli Satış Sözleşmesi",
      blocks: serializeBlocks([
        { type: "text", props: { content: "Mesafeli Satış Sözleşmesi", as: "h1", align: "center" } },
        {
          type: "text",
          props: {
            content:
              "Bu metin demo mağaza için örnek mesafeli satış ve ön bilgilendirme metnidir. Checkout sırasında onay kutusu bu sayfaya bağlanır. Gerçek hukuki metinlerinizi hukuk danışmanınızla hazırlayıp admin panelden Sayfalar bölümünden güncelleyebilirsiniz.",
            align: "left",
          },
        },
      ]),
      published: true,
    },
    update: { published: true },
  });

  for (const slug of ["contact", "faq", "kvkk"] as const) {
    const titles: Record<string, string> = {
      contact: "İletişim",
      faq: "Sık sorulan sorular",
      kvkk: "KVKK Aydınlatma Metni",
    };
    await prisma.shopPage.upsert({
      where: { siteId_slug: { siteId: site.id, slug } },
      create: {
        siteId: site.id,
        slug,
        title: titles[slug],
        blocks: serializeBlocks([
          { type: "text", props: { content: titles[slug], as: "h1", align: "center" } },
          {
            type: "text",
            props: {
              content: `Techizmet Shop şablonundan ${slug} sayfası — admin panelden düzenleyebilirsiniz.`,
              align: "left",
            },
          },
        ]),
        published: true,
      },
      update: { published: true },
    });
  }

  const collectionImages = new Map<string, string>(
    MIRROR_COLLECTION_LIST.map((c) => [c.slug, c.image]),
  );
  for (const c of MIRROR_COLLECTIONS) {
    const imageUrl = collectionImages.get(c.slug) ?? null;
    await prisma.storeCollection.upsert({
      where: { siteId_slug: { siteId: site.id, slug: c.slug } },
      create: { siteId: site.id, slug: c.slug, title: c.title, imageUrl, published: true },
      update: { title: c.title, published: true, ...(imageUrl ? { imageUrl } : {}) },
    });
  }

  const catSkincare = await prisma.storeCategory.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "cilt-bakimi" } },
    create: { siteId: site.id, slug: "cilt-bakimi", title: "Cilt Bakımı", sortOrder: 0 },
    update: { title: "Cilt Bakımı" },
  });
  const catSerum = await prisma.storeCategory.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "serumlar" } },
    create: {
      siteId: site.id,
      slug: "serumlar",
      title: "Serumlar",
      parentId: catSkincare.id,
      sortOrder: 1,
    },
    update: { title: "Serumlar", parentId: catSkincare.id },
  });

  const brandKing = await prisma.storeBrand.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "techizmet-shop" } },
    create: { siteId: site.id, slug: "techizmet-shop", name: "Techizmet Shop" },
    update: { name: "Techizmet Shop" },
  });
  await prisma.storeBrand.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "techizmet" } },
    create: { siteId: site.id, slug: "techizmet", name: "Techizmet" },
    update: { name: "Techizmet" },
  });

  const collBySlug = new Map<string, string>();
  for (const c of MIRROR_COLLECTIONS) {
    const row = await prisma.storeCollection.findUnique({
      where: { siteId_slug: { siteId: site.id, slug: c.slug } },
    });
    if (row) collBySlug.set(c.slug, row.id);
  }

  for (const slug of mirrorProductSlugsForSeed()) {
    const data = MIRROR_PRODUCT_VARIANTS[slug];
    if (!data) continue;

    const collSlugs = MIRROR_PRODUCT_COLLECTIONS[slug];
    const collectionSlug = mirrorPrimaryCollectionSlug(collSlugs, "all");
    const collectionId = collBySlug.get(collectionSlug) ?? collBySlug.get("all") ?? null;

    const badges =
      data.compareAtMinor != null
        ? (["sale", "campaign"] as const)
        : slug.includes("serum") || slug.includes("cleanser")
          ? (["new", "bestseller"] as const)
          : (["free_shipping"] as const);

    const variantRows = data.variants;
    const totalStock = variantRows.length > 1 ? variantRows.length * 10 : 12;
    const optionNameTr =
      data.variantOptionName === "Volume & Shade"
        ? "Hacim & Ton"
        : data.variantOptionName === "Volume"
          ? "Hacim"
          : data.variantOptionName === "Shade"
            ? "Ton"
            : data.variantOptionName;

    const product = await prisma.storeProduct.upsert({
      where: { siteId_slug: { siteId: site.id, slug } },
      create: {
        siteId: site.id,
        collectionId,
        categoryId: slug.includes("serum") ? catSerum.id : catSkincare.id,
        brandId: brandKing.id,
        slug,
        title: data.title,
        description: data.description ?? null,
        descriptionHtml: data.descriptionHtml ?? null,
        keyFeaturesHtml: data.keyFeaturesHtml ?? null,
        howToUseHtml: data.howToUseHtml ?? null,
        priceMinor: data.priceMinor,
        compareAtMinor: data.compareAtMinor ?? undefined,
        imageUrl: mirrorSeedImageUrl(slug),
        stockQty: totalStock,
        variantOptionName: variantRows.length > 1 ? optionNameTr : null,
        badgesJson: serializeProductBadges([...badges]),
        published: true,
      },
      update: {
        title: data.title,
        description: data.description ?? null,
        descriptionHtml: data.descriptionHtml ?? null,
        keyFeaturesHtml: data.keyFeaturesHtml ?? null,
        howToUseHtml: data.howToUseHtml ?? null,
        priceMinor: data.priceMinor,
        compareAtMinor: data.compareAtMinor ?? undefined,
        imageUrl: mirrorSeedImageUrl(slug),
        collectionId: collectionId ?? undefined,
        brandId: brandKing.id,
        variantOptionName: variantRows.length > 1 ? optionNameTr : null,
        published: true,
      },
    });

    if (variantRows.length <= 1) {
      await prisma.storeProductVariant.deleteMany({ where: { productId: product.id } });
      await prisma.storeProduct.update({
        where: { id: product.id },
        data: { stockQty: 12, variantOptionName: null },
      });
      continue;
    }

    const existingVariants = await prisma.storeProductVariant.findMany({
      where: { productId: product.id },
    });
    const keepLabels = new Set(variantRows.map((v) => v.label));
    for (const row of existingVariants) {
      if (!keepLabels.has(row.label)) {
        await prisma.storeProductVariant.delete({ where: { id: row.id } });
      }
    }

    let sortOrder = 0;
    for (const v of variantRows) {
      const payload = {
        label: v.label,
        priceMinor: v.priceMinor,
        compareAtMinor: v.compareAtMinor ?? data.compareAtMinor ?? null,
        stockQty: 10,
        sortOrder: sortOrder++,
        isDefault: v.isDefault,
      };
      const existing = await prisma.storeProductVariant.findFirst({
        where: { productId: product.id, label: v.label },
      });
      if (existing) {
        await prisma.storeProductVariant.update({ where: { id: existing.id }, data: payload });
      } else {
        await prisma.storeProductVariant.create({
          data: { productId: product.id, ...payload },
        });
      }
    }

    await prisma.storeProduct.update({
      where: { id: product.id },
      data: { stockQty: variantRows.length * 10 },
    });
  }

  await prisma.storeCampaign.upsert({
    where: { siteId_code: { siteId: site.id, code: "ILKALIS" } },
    create: {
      siteId: site.id,
      name: "İlk alışveriş %10",
      code: "ILKALIS",
      type: "percent_off",
      percentOff: 10,
      minCartMinor: 50000,
      active: true,
    },
    update: { active: true },
  });

  await prisma.storeCampaign.upsert({
    where: { siteId_code: { siteId: site.id, code: "KARGO300" } },
    create: {
      siteId: site.id,
      name: "300 TL üzeri ücretsiz kargo",
      code: "KARGO300",
      type: "free_shipping",
      freeShipping: true,
      minCartMinor: 30000,
      active: true,
    },
    update: { active: true },
  });

  for (const [i, p] of SHIPPING_CARRIER_PRESETS.entries()) {
    const carrier = await prisma.shippingCarrier.upsert({
      where: { siteId_code: { siteId: site.id, code: p.code } },
      create: {
        siteId: site.id,
        code: p.code,
        name: p.name,
        trackingUrlTemplate: p.trackingUrlTemplate,
        active: p.code === "yurtici",
        sortOrder: i,
      },
      update: {
        name: p.name,
        trackingUrlTemplate: p.trackingUrlTemplate,
        active: p.code === "yurtici",
      },
    });
    if (p.code === "yurtici") {
      const existingRate = await prisma.shippingRate.findFirst({ where: { carrierId: carrier.id } });
      if (!existingRate) {
        await prisma.shippingRate.create({
          data: {
            carrierId: carrier.id,
            name: "Standart gönderi",
            priceMinor: 8900,
            freeOverMinor: 30000,
            sortOrder: 0,
          },
        });
      }
    }
  }

  const bayiGroup = await prisma.customerGroup.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "bayi" } },
    create: {
      siteId: site.id,
      name: "Bayi",
      slug: "bayi",
      discountPercent: 15,
      active: true,
      description: "Kayıtlı bayi müşterileri — satış fiyatı üzerinden %15 indirim",
    },
    update: { discountPercent: 15, active: true },
  });
  console.log("[seed] Üye grubu:", bayiGroup.name, `%${bayiGroup.discountPercent} (admin → Müşteri kartından ata)`);

  const navSeed = await seedVitrinHeaderMenu(site.id, false);
  console.log("[seed] Vitrin menüsü:", navSeed.created ? "oluşturuldu" : navSeed.reason ?? "atlandı");

  console.log("[seed] Tamam:", site.slug);
  console.log("[seed] Admin: admin /", plain);
  console.log("[seed] Vitrin: http://localhost:5555");
  console.log("[seed] Panel: http://localhost:5555/admin/login");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
