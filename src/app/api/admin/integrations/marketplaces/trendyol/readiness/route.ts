import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import { listCategoryMappings } from "@/lib/marketplace/category-mapping";

type Check = { key: string; label: string; ok: boolean; detail: string; optional?: boolean };

export async function GET() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId: auth.siteId, platform: "trendyol" },
  });

  let config: Record<string, string> = {};
  try {
    config = JSON.parse(integration?.configJson ?? "{}") as Record<string, string>;
  } catch {
    config = {};
  }

  const creds = parseTrendyolConfig(config);
  const cargo = config.cargoCompanyId?.trim();
  const shipAddr = config.shipmentAddressId?.trim();
  const returnAddr = config.returningAddressId?.trim();
  const defaultCat = (config.trendyolCategoryId ?? config.categoryId ?? "").trim();
  const defaultBrand = (config.trendyolBrandId ?? config.brandId ?? "").trim();

  let mappings: Awaited<ReturnType<typeof listCategoryMappings>> = [];
  try {
    mappings = await listCategoryMappings(auth.siteId, "trendyol");
  } catch {
    mappings = [];
  }
  const hasCategoryRouting = mappings.length > 0 || Boolean(defaultCat && defaultBrand);

  const totalPublished = await prisma.storeProduct.count({
    where: { siteId: auth.siteId, published: true },
  });
  const withBarcode = await prisma.storeProduct.count({
    where: { siteId: auth.siteId, published: true, barcode: { not: null } },
  });

  const checks: Check[] = [
    {
      key: "credentials",
      label: "API kimlik bilgileri (Satıcı ID, API Key, API Secret)",
      ok: Boolean(creds),
      detail: creds ? "Tanımlı" : "Entegrasyon ayarlarından girin",
    },
    {
      key: "cargo",
      label: "Kargo firması",
      ok: Boolean(cargo),
      detail: cargo ? `ID: ${cargo}` : "Entegrasyon ayarlarından kargo firması seçin",
    },
    {
      key: "shipmentAddress",
      label: "Sevkiyat adresi (opsiyonel)",
      ok: Boolean(shipAddr),
      optional: true,
      detail: shipAddr ? `ID: ${shipAddr}` : "Boş bırakılırsa Trendyol'daki varsayılan adres kullanılır",
    },
    {
      key: "returnAddress",
      label: "İade adresi (opsiyonel)",
      ok: Boolean(returnAddr),
      optional: true,
      detail: returnAddr ? `ID: ${returnAddr}` : "Boş bırakılırsa Trendyol'daki varsayılan adres kullanılır",
    },
    {
      key: "categoryRouting",
      label: "Kategori / marka eşlemesi",
      ok: hasCategoryRouting,
      detail: hasCategoryRouting
        ? mappings.length
          ? `${mappings.length} kategori eşlemesi tanımlı`
          : "Varsayılan kategori/marka tanımlı"
        : "En az bir kategori eşlemesi ekleyin veya varsayılan kategori/marka girin",
    },
    {
      key: "products",
      label: "Barkodlu ürün",
      ok: withBarcode > 0,
      detail:
        withBarcode > 0
          ? `${withBarcode}/${totalPublished} yayın üründe barkod var`
          : `Yayında ${totalPublished} ürün var ama hiçbirinde barkod yok — Trendyol barkod zorunlu`,
    },
  ];

  const ready = checks.every((c) => c.ok || c.optional);

  return NextResponse.json({
    ready,
    checks,
    stats: { totalPublished, withBarcode },
  });
}
