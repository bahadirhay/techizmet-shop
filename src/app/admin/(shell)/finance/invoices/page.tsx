import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FinanceInvoicesManager } from "@/components/admin/FinanceInvoicesManager";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function FinanceInvoicesPage() {
  const auth = await requireStaffPage();
  await ensureFinanceDefaults(auth.siteId);

  const [invoices, categories, accounts, customers, counterparties] = await Promise.all([
    prisma.financeInvoice.findMany({
      where: { siteId: auth.siteId },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        counterparty: { select: { id: true, title: true, type: true, taxId: true } },
        category: { select: { id: true, name: true, kind: true } },
        account: { select: { id: true, name: true, kind: true } },
      },
    }),
    prisma.financeCategory.findMany({
      where: { siteId: auth.siteId, active: true },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
      select: { id: true, name: true, kind: true },
    }),
    prisma.financeAccount.findMany({
      where: { siteId: auth.siteId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true },
    }),
    prisma.storeCustomer.findMany({
      where: { siteId: auth.siteId },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.financeCounterparty.findMany({
      where: { siteId: auth.siteId, active: true },
      orderBy: { title: "asc" },
      take: 300,
      select: { id: true, title: true, type: true, taxId: true },
    }),
  ]);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ön muhasebe", href: "/admin/finance" }, { label: "Faturalar & onay" }]}
        title="Faturalar & onay kuyruğu"
        description="GİB veya manuel faturaları önce onaylayın, sonra muhasebe hareketine işlensin."
      />
      <FinanceInvoicesManager
        initialInvoices={invoices}
        categories={categories}
        accounts={accounts}
        customers={customers}
        counterparties={counterparties}
      />
    </div>
  );
}
