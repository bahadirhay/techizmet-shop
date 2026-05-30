#!/usr/bin/env node
/** settingsJson içine theme.homepageMode: mirror ekler (eksikse) */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const site = await prisma.storeSite.findFirst();
  if (!site) {
    console.error("Site yok");
    process.exit(1);
  }
  let settings = {};
  try {
    settings = JSON.parse(site.settingsJson || "{}");
  } catch {
    settings = {};
  }
  if (settings.theme?.homepageMode === "blocks") {
    console.log("homepageMode blocks → mirror olarak güncelleniyor.");
  }
  const defaultNav = [
    { id: "home", href: "/", labelTr: "Ana Sayfa", labelEn: "Home" },
    { id: "best", href: "/collections/all", labelTr: "Çok Satanlar", labelEn: "Best Sellers" },
    { id: "collections", href: "/collections", labelTr: "Koleksiyonlar", labelEn: "Collections" },
    { id: "about", href: "/pages/about", labelTr: "Hakkımızda", labelEn: "About" },
    { id: "contact", href: "/pages/contact", labelTr: "İletişim", labelEn: "Contact" },
  ];
  settings.theme = {
    ...settings.theme,
    homepageMode: "mirror",
    navItems: settings.theme?.navItems?.length ? settings.theme.navItems : defaultNav,
  };
  await prisma.storeSite.update({
    where: { id: site.id },
    data: {
      settingsJson: JSON.stringify(settings),
      themeId: "king-noor",
    },
  });
  console.log("[ensure-mirror-homepage] theme.homepageMode=mirror, themeId=king-noor");
  await prisma.$disconnect();
}

main();
