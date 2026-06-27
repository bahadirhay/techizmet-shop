import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BeyannameManager } from "@/components/admin/BeyannameManager";
import { getTaxConfig, type TaxObligationType } from "@/lib/finance/tax";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffPage } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export default async function FinanceBeyannamePage() {
  const auth = await requireStaffPage();
  const year = new Date().getUTCFullYear();

  const [site, obligations, invoiceGroups] = await Promise.all([
    prisma.storeSite.findUnique({ where: { id: auth.siteId } }),
    prisma.taxObligation.findMany({
      where: { siteId: auth.siteId, year },
      orderBy: { dueDate: "asc" },
    }),
    prisma.invoiceEntry.groupBy({
      by: ["direction"],
      where: {
        siteId: auth.siteId,
        invoiceDate: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      _sum: { netMinor: true, kdvMinor: true },
      _count: true,
    }),
  ]);

  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const config = getTaxConfig(settings);

  const initialObligations = obligations.map((o) => ({
    ...o,
    type: o.type as TaxObligationType,
    status: o.status as "bekliyor" | "beyan_edildi" | "odendi",
    periodStart: o.periodStart.toISOString(),
    periodEnd: o.periodEnd.toISOString(),
    dueDate: o.dueDate.toISOString(),
    declaredAt: o.declaredAt ? o.declaredAt.toISOString() : null,
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  const yearInvoiceSummary = {
    outgoingNet: invoiceGroups.find((r) => r.direction === "outgoing")?._sum.netMinor ?? 0,
    outgoingKdv: invoiceGroups.find((r) => r.direction === "outgoing")?._sum.kdvMinor ?? 0,
    incomingNet: invoiceGroups.find((r) => r.direction === "incoming")?._sum.netMinor ?? 0,
    incomingKdv: invoiceGroups.find((r) => r.direction === "incoming")?._sum.kdvMinor ?? 0,
    totalEntries:
      (invoiceGroups.find((r) => r.direction === "outgoing")?._count ?? 0) +
      (invoiceGroups.find((r) => r.direction === "incoming")?._count ?? 0),
  };

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ön muhasebe", href: "/admin/finance" }, { label: "Beyanname Takibi" }]}
        title="Beyanname & Vergi Takibi"
        description="Şahıs şirketi vergi yükümlülükleri: KDV, muhtasar, geçici vergi ve yıllık gelir vergisi beyannamelerini son tarih, tutar ve durumlarıyla takip edin."
      />
      <BeyannameManager
        initialYear={year}
        initialObligations={initialObligations}
        initialConfig={config}
        yearInvoiceSummary={yearInvoiceSummary}
      />
    </div>
  );
}
