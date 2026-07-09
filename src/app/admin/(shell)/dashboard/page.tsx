import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { OperationsChecklist } from "@/components/admin/OperationsChecklist";
import { loadOperationsChecklist } from "@/lib/admin/operations-checklist";
import { safeCount } from "@/lib/admin/safe-count";
import { loadDashboardCharts } from "@/lib/admin/nav-badges";
import { formatTry } from "@/lib/admin/money";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUSES } from "@/lib/admin/marketplace-platforms";

function statusLabel(id: string) {
  return ORDER_STATUSES.find((s) => s.id === id)?.label ?? id;
}

export default async function DashboardPage() {
  const auth = await requireStaffPage();
  const lowThreshold = 5;

  const [
    products,
    categories,
    brands,
    orders,
    pendingOrders,
    campaigns,
    lowStock,
    carriers,
    integrations,
    customers,
  ] = await Promise.all([
    safeCount("storeProduct", { where: { siteId: auth.siteId } }),
    safeCount("storeCategory", { where: { siteId: auth.siteId } }),
    safeCount("storeBrand", { where: { siteId: auth.siteId } }),
    safeCount("storeOrder", { where: { siteId: auth.siteId } }),
    safeCount("storeOrder", {
      where: {
        siteId: auth.siteId,
        status: { in: ["pending", "confirmed", "preparing"] },
        NOT: { paymentMethod: "card", paymentStatus: { in: ["unpaid", "failed"] } },
      },
    }),
    safeCount("storeCampaign", { where: { siteId: auth.siteId, active: true } }),
    safeCount("storeProduct", {
      where: { siteId: auth.siteId, published: true, stockQty: { lte: lowThreshold } },
    }),
    safeCount("shippingCarrier", { where: { siteId: auth.siteId, active: true } }),
    safeCount("marketplaceIntegration", { where: { siteId: auth.siteId, active: true } }),
    safeCount("storeCustomer", { where: { siteId: auth.siteId } }),
  ]);

  const revenueAgg = await prisma.storeOrder.aggregate({
    where: { siteId: auth.siteId, status: { notIn: ["cancelled"] } },
    _sum: { totalMinor: true },
  });
  const totalRevenue = revenueAgg._sum.totalMinor ?? 0;

  const [recentOrders, charts, operationsChecklist] = await Promise.all([
    prisma.storeOrder.findMany({
      where: { siteId: auth.siteId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    loadDashboardCharts(auth.siteId),
    loadOperationsChecklist(auth.siteId),
  ]);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthAgg = await prisma.storeOrder.aggregate({
    where: { siteId: auth.siteId, createdAt: { gte: startOfMonth }, status: { notIn: ["cancelled"] } },
    _sum: { totalMinor: true },
    _count: true,
  });

  return (
    <div>
      <AdminPageHeader
        title="Özet Panel"
        description="Mağaza performansı ve hızlı yönetim kısayolları."
      />

      <div className="admin-kpi-grid">
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#2563eb" }}>
          <p className="admin-kpi-label">Toplam ciro</p>
          <p className="admin-kpi-value">{formatTry(totalRevenue)}</p>
          <p className="admin-kpi-meta">
            Bu ay: {formatTry(monthAgg._sum.totalMinor ?? 0)} · {monthAgg._count} sipariş
          </p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#16a34a" }}>
          <p className="admin-kpi-label">Sipariş</p>
          <p className="admin-kpi-value">{orders}</p>
          <p className="admin-kpi-meta">{pendingOrders} işlem bekliyor</p>
          <Link href="/admin/orders?status=pending" className="admin-kpi-link">
            Onay Bekleyenler →
          </Link>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "var(--kn-brand)" }}>
          <p className="admin-kpi-label">Ürün</p>
          <p className="admin-kpi-value">{products}</p>
          <Link href="/admin/products" className="admin-kpi-link">
            Ürün Yönetimi →
          </Link>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#ea580c" }}>
          <p className="admin-kpi-label">Kategori / Marka</p>
          <p className="admin-kpi-value">
            {categories} <span className="text-lg font-normal text-zinc-400">/</span> {brands}
          </p>
          <div className="mt-1 flex gap-3">
            <Link href="/admin/categories" className="admin-kpi-link">
              Kategoriler
            </Link>
            <Link href="/admin/brands" className="admin-kpi-link">
              Markalar
            </Link>
          </div>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#dc2626" }}>
          <p className="admin-kpi-label">Düşük stok</p>
          <p className={`admin-kpi-value ${lowStock > 0 ? "text-red-600" : ""}`}>{lowStock}</p>
          <Link href="/admin/products" className="admin-kpi-link">
            Stok kontrolü →
          </Link>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#7c3aed" }}>
          <p className="admin-kpi-label">Müşteri · Kampanya</p>
          <p className="admin-kpi-value">
            {customers} <span className="text-lg font-normal text-zinc-400">·</span> {campaigns}
          </p>
          <p className="admin-kpi-meta">aktif kupon/kampanya</p>
        </div>
      </div>

      <DashboardCharts last7Days={charts.last7Days} statusBreakdown={charts.statusBreakdown} />

      <div className="mt-8">
        <OperationsChecklist snapshot={operationsChecklist} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="admin-card admin-card-pad">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Son siparişler</h2>
            <Link href="/admin/orders" className="text-sm text-[var(--kn-brand)]">
              Tümü
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Henüz sipariş yok.</p>
          ) : (
            <ul className="mt-4 divide-y">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-[var(--kn-brand)]">
                      {o.orderNumber}
                    </Link>
                    <p className="text-zinc-500">
                      {o.customerName ?? o.customerEmail ?? "Misafir"} · {statusLabel(o.status)}
                    </p>
                  </div>
                  <span className="font-medium">{formatTry(o.totalMinor)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card admin-card-pad">
          <h2 className="font-semibold">Hızlı işlemler</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link
              href="/admin/products/new"
              className="rounded-lg border border-zinc-200 p-3 hover:border-[var(--kn-brand)]"
            >
              <p className="font-medium">+ Yeni ürün</p>
              <p className="text-xs text-zinc-500">Fiyat, stok, etiket</p>
            </Link>
            <Link
              href="/admin/categories/new"
              className="rounded-lg border border-zinc-200 p-3 hover:border-[var(--kn-brand)]"
            >
              <p className="font-medium">+ Kategori</p>
              <p className="text-xs text-zinc-500">Hiyerarşik ağaç</p>
            </Link>
            <Link
              href="/admin/brands/new"
              className="rounded-lg border border-zinc-200 p-3 hover:border-[var(--kn-brand)]"
            >
              <p className="font-medium">+ Marka</p>
              <p className="text-xs text-zinc-500">Logo ve slug</p>
            </Link>
            <Link
              href="/admin/campaigns/new"
              className="rounded-lg border border-zinc-200 p-3 hover:border-[var(--kn-brand)]"
            >
              <p className="font-medium">+ Kampanya</p>
              <p className="text-xs text-zinc-500">Kupon, ücretsiz kargo</p>
            </Link>
            <Link
              href="/admin/integrations"
              className="rounded-lg border border-zinc-200 p-3 hover:border-[var(--kn-brand)]"
            >
              <p className="font-medium">Pazaryeri & Ödeme</p>
              <p className="text-xs text-zinc-500">{integrations} aktif entegrasyon</p>
            </Link>
            <Link
              href="/admin/shipping"
              className="rounded-lg border border-zinc-200 p-3 hover:border-[var(--kn-brand)]"
            >
              <p className="font-medium">Kargo</p>
              <p className="text-xs text-zinc-500">{carriers} aktif firma</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
