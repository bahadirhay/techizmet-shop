import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StoreInsightsPanel, type StoreInsightRow } from "@/components/admin/StoreInsightsPanel";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function StoreInsightsPage() {
  const auth = await requireStaffPage();

  const rows = await prisma.storePerformanceInsight.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ status: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const insights: StoreInsightRow[] = rows.map((r) => ({
    id: r.id,
    channel: r.channel,
    category: r.category,
    severity: r.severity,
    title: r.title,
    detail: r.detail,
    actionType: r.actionType,
    status: r.status,
    executionError: r.executionError,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Entegrasyonlar", href: "/admin/integrations" }, { label: "Performans & AI Öneriler" }]}
        title="Performans & AI Öneriler"
        description="Trendyol, Amazon ve Instagram verilerini analiz edip önceliklendirilmiş öneriler üretir. Instagram gönderi önerileri dışındaki her şey bilgilendirme amaçlıdır — onayladığınız Instagram önerileri gerçek ürün görselleriyle içerik üretip doğrudan yayınlar."
      />
      <StoreInsightsPanel initialInsights={insights} />
    </div>
  );
}
