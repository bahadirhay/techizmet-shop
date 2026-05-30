import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FinanceTransactionForm } from "@/components/admin/FinanceTransactionForm";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function NewFinanceTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; orderId?: string }>;
}) {
  const auth = await requireStaffPage();
  const { kind, orderId } = await searchParams;

  await ensureFinanceDefaults(auth.siteId);

  const [categories, accounts, order] = await Promise.all([
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
    orderId
      ? prisma.storeOrder.findFirst({
          where: { id: orderId, siteId: auth.siteId },
          select: { id: true, orderNumber: true, marketplacePlatform: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Ön muhasebe", href: "/admin/finance" },
          { label: "Hareketler", href: "/admin/finance/transactions" },
          { label: "Yeni" },
        ]}
        title="Yeni muhasebe hareketi"
        description="Gider, gelir, tahsilat veya pazaryeri kesinti / hakediş kaydı."
      />
      <FinanceTransactionForm
        initialKind={kind}
        categories={categories}
        accounts={accounts}
        orderId={order?.id}
        orderNumber={order?.orderNumber}
      />
    </div>
  );
}
