import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FinanceMasterDataManager } from "@/components/admin/FinanceMasterDataManager";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function FinanceMasterDataPage() {
  const auth = await requireStaffPage();
  await ensureFinanceDefaults(auth.siteId);
  const [counterparties, categories, accounts, templates] = await Promise.all([
    prisma.financeCounterparty.findMany({
      where: { siteId: auth.siteId, active: true },
      orderBy: { title: "asc" },
      take: 300,
      select: { id: true, type: true, title: true, taxId: true },
    }),
    prisma.financeCategory.findMany({
      where: { siteId: auth.siteId },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
      select: { id: true, name: true, kind: true },
    }),
    prisma.financeAccount.findMany({
      where: { siteId: auth.siteId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true },
    }),
    prisma.financePostingTemplate.findMany({
      where: { siteId: auth.siteId },
      orderBy: [{ active: "desc" }, { priority: "asc" }],
      include: { category: { select: { name: true } }, account: { select: { name: true } } },
    }),
  ]);
  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ön muhasebe", href: "/admin/finance" }, { label: "Tanımlar" }]}
        title="Muhasebe tanımları"
        description="Karşı taraf, kategori ve hesap tanımlarını yönetin. Ekledikleriniz listelerde kullanılır."
      />
      <FinanceMasterDataManager
        initialCounterparties={counterparties}
        initialCategories={categories}
        initialAccounts={accounts}
        initialTemplates={templates}
      />
    </div>
  );
}
