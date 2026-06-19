import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CounterpartyCreditForm } from "@/components/admin/CounterpartyCreditForm";
import { FinanceCounterpartyDetailView } from "@/components/admin/FinanceCounterpartyDetailView";
import { loadCariCounterpartyDetail } from "@/lib/finance/cari-ledger";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function FinanceCounterpartyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireStaffPage();
  const { id } = await params;
  const detail = await loadCariCounterpartyDetail(auth.siteId, id);
  if (!detail) notFound();

  const cpRow = await prisma.financeCounterparty.findFirst({
    where: { id, siteId: auth.siteId },
    select: {
      paymentTermDays: true,
      creditLimitMinor: true,
      openAccountEnabled: true,
      creditHold: true,
      preferredPaymentMethod: true,
      tags: true,
    },
  });

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Ön Muhasebe", href: "/admin/finance" },
          { label: "Cari", href: "/admin/finance/cari" },
          { label: detail.title },
        ]}
        title={detail.title}
        description="Cari kart — bakiye, açık kalemler ve hareket defteri."
        actions={
          <Link
            href="/admin/finance/cari"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
          >
            ← Cari listesi
          </Link>
        }
      />
      <FinanceCounterpartyDetailView detail={detail} />
      {cpRow ? (
        <div className="mt-6">
          <CounterpartyCreditForm
            counterpartyId={id}
            initial={{
              paymentTermDays: cpRow.paymentTermDays,
              creditLimitMinor: cpRow.creditLimitMinor,
              openAccountEnabled: cpRow.openAccountEnabled,
              creditHold: cpRow.creditHold,
              preferredPaymentMethod: cpRow.preferredPaymentMethod,
              tags: cpRow.tags,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
