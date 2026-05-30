import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MarketplaceIntegrationsClient } from "@/components/admin/MarketplaceIntegrationsClient";
import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";
import { listCategoryMappings } from "@/lib/marketplace/category-mapping";
import { listCommissionRules } from "@/lib/marketplace/commission-rules";
import { marketplaceCategoryMappingDb, marketplaceCommissionRuleDb } from "@/lib/marketplace/prisma-marketplace";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const { platform } = await searchParams;
  const auth = await requireStaffPage();
  const platformNorm = platform?.trim().toLowerCase();
  const [rows, categories, categoryMappings, commissionRules] = await Promise.all([
    prisma.marketplaceIntegration.findMany({
      where: { siteId: auth.siteId },
      orderBy: { platform: "asc" },
    }),
    prisma.storeCategory.findMany({
      where: { siteId: auth.siteId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    platformNorm ? listCategoryMappings(auth.siteId, platformNorm) : Promise.resolve([]),
    platformNorm ? listCommissionRules(auth.siteId, platformNorm) : Promise.resolve([]),
  ]);

  const initial = rows.map((r) => ({
    platform: r.platform,
    label: r.label,
    active: r.active,
    configJson: r.configJson,
    lastSyncAt: r.lastSyncAt?.toISOString() ?? null,
    lastError: r.lastError,
  }));

  const marketplaceTablesReady = Boolean(marketplaceCategoryMappingDb());
  const commissionTablesReady = Boolean(marketplaceCommissionRuleDb());

  const platformLabel = MARKETPLACE_PLATFORMS.find((p) => p.id === platform)?.label;

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");
  const appOrigin = host ? `${proto}://${host}` : "";

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Pazaryeri" }, { label: platformLabel ?? "Tüm platformlar" }]}
        title={platformLabel ? `${platformLabel} entegrasyonu` : "Pazaryeri entegrasyonları"}
        description="Sol menü → Pazaryeri altından platform seçin; API ayarları ve senkron burada."
        actions={
          <Link
            href="/admin/integrations/payments"
            className="text-sm text-[var(--kn-brand)] underline"
          >
            Ödeme ayarları →
          </Link>
        }
      />
      {!platform ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MARKETPLACE_PLATFORMS.map((p) => {
            const row = initial.find((r) => r.platform === p.id);
            return (
              <Link
                key={p.id}
                href={`/admin/integrations?platform=${p.id}`}
                className="rounded-xl border bg-white p-4 transition hover:border-zinc-400"
              >
                <span className="font-medium">{p.label}</span>
                {row?.active ? (
                  <span className="ml-2 text-xs text-green-600">aktif</span>
                ) : (
                  <span className="ml-2 text-xs text-zinc-400">pasif</span>
                )}
                {row?.lastSyncAt ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Son senkron: {new Date(row.lastSyncAt).toLocaleString("tr-TR")}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-zinc-400">Henüz senkron yok</p>
                )}
              </Link>
            );
          })}
        </div>
      ) : null}
      <Suspense fallback={<p className="text-sm text-zinc-500">Yükleniyor…</p>}>
        <MarketplaceIntegrationsClient
          initial={initial}
          initialPlatform={platform}
          appOrigin={appOrigin}
          marketplaceTablesReady={marketplaceTablesReady}
          categories={categories.map((c) => ({ id: c.id, label: c.title }))}
          categoryMappings={categoryMappings.map((m) => ({
            id: m.id,
            categoryId: m.categoryId,
            categoryTitle: m.category?.title ?? "Varsayılan (tümü)",
            platformCategoryId: m.platformCategoryId,
            platformBrandId: m.platformBrandId,
          }))}
          commissionRules={commissionRules}
          commissionTablesReady={commissionTablesReady}
        />
      </Suspense>
    </div>
  );
}
