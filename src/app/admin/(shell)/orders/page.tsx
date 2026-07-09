import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  orderSourceLabel,
  orderSourceBadgeClass,
  orderSourcePrismaFilter,
  ordersListHref,
  ORDER_SOURCE_FILTERS,
} from "@/lib/marketplace/order-source";
import { formatTry } from "@/lib/admin/money";
import { ORDER_STATUSES } from "@/lib/admin/marketplace-platforms";
import { isCardOrderAwaitingPayment } from "@/lib/orders/card-payment";
import { paymentStatusAdminLabel } from "@/lib/orders/public-order";
import {
  isOrderInvoiceComplete,
  orderInvoicePendingWhere,
} from "@/lib/admin/order-invoice-workflow";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

function statusLabel(id: string) {
  return ORDER_STATUSES.find((s) => s.id === id)?.label ?? id;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; invoice?: string }>;
}) {
  const auth = await requireStaffPage();
  const { status, source, invoice } = await searchParams;
  const invoicePending = invoice === "pending";
  const where = {
    siteId: auth.siteId,
    ...(invoicePending
      ? orderInvoicePendingWhere()
      : status === "awaiting_payment"
        ? {
            OR: [
              { status: "awaiting_payment" },
              { paymentMethod: "card", paymentStatus: { in: ["unpaid", "failed"] } },
            ],
          }
        : status === "refund_requested"
          ? { status: { in: ["refund_requested", "cancelled"] } }
          : status === "pending"
            ? {
                status: "pending",
                NOT: { paymentMethod: "card", paymentStatus: { in: ["unpaid", "failed"] } },
              }
            : status
              ? { status }
              : {}),
    ...orderSourcePrismaFilter(source),
  };

  const orders = await prisma.storeOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { carrier: true, _count: { select: { lines: true } } },
  });

  const activeSource = source ?? "all";

  const title = invoicePending
    ? "Fatura Bekleyen Siparişler"
    : status === "awaiting_payment"
      ? "Ödeme Bekleyen Siparişler"
      : status === "pending"
      ? "Onay Bekleyen Siparişler"
      : status === "preparing"
        ? "Hazırlanan Siparişler"
        : status === "shipped"
          ? "Kargodaki Siparişler"
          : status === "refund_requested"
            ? "İade Talepleri"
            : "Tüm Siparişler";

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Siparişler" }]}
        title={title}
        description={
          invoicePending
            ? "Kargoya verilmiş veya teslim edilmiş; e-Arşiv faturası henüz kesilmemiş siparişler."
            : "Durum, ödeme ve kargo takibi."
        }
        actions={
          <Link
            href="/admin/orders/labels"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
          >
            Kargo Etiketi Yazdır
          </Link>
        }
      />
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <Link
          href={ordersListHref({
            source: activeSource === "all" ? undefined : activeSource,
          })}
          className={`rounded-lg px-3 py-1.5 ${!status && !invoicePending ? "bg-[var(--kn-brand)] text-white" : "border bg-white"}`}
        >
          Tümü
        </Link>
        <Link
          href={ordersListHref({
            invoice: "pending",
            source: activeSource === "all" ? undefined : activeSource,
          })}
          className={`rounded-lg px-3 py-1.5 ${invoicePending ? "bg-[var(--kn-brand)] text-white" : "border bg-white"}`}
        >
          Fatura Bekleyen
        </Link>
        {(["awaiting_payment", "pending", "preparing", "shipped", "refund_requested"] as const).map((s) => (
          <Link
            key={s}
            href={ordersListHref({
              status: s,
              source: activeSource === "all" ? undefined : activeSource,
            })}
            className={`rounded-lg px-3 py-1.5 ${status === s && !invoicePending ? "bg-[var(--kn-brand)] text-white" : "border bg-white"}`}
          >
            {statusLabel(s)}
          </Link>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {ORDER_SOURCE_FILTERS.map((f) => (
          <Link
            key={f.id}
            href={ordersListHref({
              status,
              source: f.id === "all" ? undefined : f.id,
            })}
            className={`rounded-lg px-3 py-1.5 ${
              activeSource === f.id
                ? "border border-[var(--kn-brand)] bg-[var(--kn-brand)]/10 text-[var(--kn-brand)] font-medium"
                : "border bg-white hover:bg-zinc-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      {orders.length === 0 ? (
        <p className="text-zinc-500">Bu filtrede sipariş yok.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Kaynak</th>
                <th>Sipariş</th>
                <th>Müşteri</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Ödeme</th>
                <th>Kargo</th>
                <th>Fatura</th>
                <th>Tarih</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${orderSourceBadgeClass(o.marketplacePlatform)}`}
                    >
                      {orderSourceLabel(o)}
                    </span>
                  </td>
                  <td className="font-medium">{o.orderNumber}</td>
                  <td>{o.customerName ?? o.customerEmail ?? "—"}</td>
                  <td>{formatTry(o.totalMinor)}</td>
                  <td>{statusLabel(o.status)}</td>
                  <td>
                    <span
                      className={
                        isCardOrderAwaitingPayment(o)
                          ? "inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800"
                          : o.paymentStatus === "paid"
                            ? "text-xs text-emerald-700"
                            : "text-zinc-600 text-xs"
                      }
                    >
                      {paymentStatusAdminLabel(o.paymentMethod, o.paymentStatus)}
                    </span>
                  </td>
                  <td>{o.carrier?.name ?? "—"}</td>
                  <td>
                    {isOrderInvoiceComplete(o.invoiceStatus) ? (
                      <span className="text-xs text-emerald-700">Kesildi</span>
                    ) : o.invoiceStatus === "draft" ? (
                      <span className="text-xs text-amber-700">Taslak</span>
                    ) : (
                      <span className="text-xs font-medium text-amber-800">Bekliyor</span>
                    )}
                  </td>
                  <td className="text-zinc-500">{o.createdAt.toLocaleDateString("tr-TR")}</td>
                  <td>
                    <Link
                      href={
                        !isOrderInvoiceComplete(o.invoiceStatus) &&
                        (o.status === "shipped" || o.status === "delivered")
                          ? `/admin/orders/${o.id}?focus=invoice`
                          : `/admin/orders/${o.id}`
                      }
                      className="text-[var(--kn-brand)]"
                    >
                      {invoicePending || !isOrderInvoiceComplete(o.invoiceStatus)
                        ? "Fatura →"
                        : "Detay"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
