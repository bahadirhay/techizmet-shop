import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatTry } from "@/lib/admin/money";
import { financeKindLabel } from "@/lib/finance/types";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function FinanceTransactionsPage() {
  const auth = await requireStaffPage();
  await ensureFinanceDefaults(auth.siteId);

  const transactions = await prisma.financeTransaction.findMany({
    where: { siteId: auth.siteId },
    orderBy: { txDate: "desc" },
    take: 100,
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
      order: { select: { orderNumber: true, id: true } },
    },
  });

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ön muhasebe", href: "/admin/finance" }, { label: "Hareketler" }]}
        title="Muhasebe hareketleri"
        description="Son 100 kayıt — gelir, gider, tahsilat ve pazaryeri kesintileri."
        actions={
          <Link
            href="/admin/finance/transactions/new"
            className="rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Yeni hareket
          </Link>
        }
      />

      <section className="admin-card admin-card-pad overflow-x-auto">
        {transactions.length === 0 ? (
          <p className="text-sm text-zinc-500">Henüz hareket yok.</p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2">Tarih</th>
                <th className="pb-2">Tür</th>
                <th className="pb-2">Açıklama</th>
                <th className="pb-2">Kategori</th>
                <th className="pb-2">Hesap</th>
                <th className="pb-2">Sipariş</th>
                <th className="pb-2 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-zinc-100">
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {new Date(t.txDate).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="py-2 pr-2">{financeKindLabel(t.kind)}</td>
                  <td className="py-2 pr-2 max-w-[200px] truncate">{t.description}</td>
                  <td className="py-2 pr-2">{t.category?.name ?? "—"}</td>
                  <td className="py-2 pr-2">{t.account?.name ?? "—"}</td>
                  <td className="py-2 pr-2">
                    {t.order ? (
                      <Link href={`/admin/orders/${t.order.id}`} className="text-[var(--kn-brand)] underline">
                        {t.order.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatTry(t.amountMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
