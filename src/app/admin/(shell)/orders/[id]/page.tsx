import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDeliveryBlock } from "@/components/admin/OrderDeliveryBlock";
import { OrderLinesPanel } from "@/components/admin/OrderLinesPanel";
import { OrderFinancePanel } from "@/components/admin/OrderFinancePanel";
import { OrderDetailForm } from "@/components/admin/OrderDetailForm";
import { GeliverOrderPanel } from "@/components/admin/GeliverOrderPanel";
import { HepsijetOrderPanel } from "@/components/admin/HepsijetOrderPanel";
import { MarketplaceOrderPanel } from "@/components/admin/MarketplaceOrderPanel";
import { OrderInvoicePanel } from "@/components/admin/OrderInvoicePanel";
import { isOrderInvoiceComplete } from "@/lib/admin/order-invoice-workflow";
import { efaturaReady, getEfaturaConfig } from "@/lib/efatura/settings";
import { orderSourceLabel, orderSourceBadgeClass } from "@/lib/marketplace/order-source";
import { parseOrderFinanceSnapshot } from "@/lib/finance/order-economics";
import { formatTry } from "@/lib/admin/money";
import { ORDER_STATUSES } from "@/lib/admin/marketplace-platforms";
import { prisma } from "@/lib/prisma";
import { parseCarrierConfig } from "@/lib/shipping/carrier-config";
import { requireStaffPage } from "@/lib/staff-auth";

function statusLabel(id: string) {
  return ORDER_STATUSES.find((s) => s.id === id)?.label ?? id;
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const auth = await requireStaffPage();
  const { id } = await params;
  const { focus } = await searchParams;
  const focusInvoice = focus === "invoice";
  const order = await prisma.storeOrder.findFirst({
    where: { id, siteId: auth.siteId },
    include: { lines: true, carrier: true, customer: true },
  });
  if (!order) notFound();

  const carriers = await prisma.shippingCarrier.findMany({
    where: { siteId: auth.siteId, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, trackingUrlTemplate: true },
  });

  const efaturaConfig = await getEfaturaConfig(auth.siteId);

  const financeTransactions = await prisma.financeTransaction.findMany({
    where: { siteId: auth.siteId, orderId: order.id },
    orderBy: { txDate: "desc" },
    select: {
      id: true,
      kind: true,
      amountMinor: true,
      txDate: true,
      description: true,
      reconciliationStatus: true,
    },
  });

  const financeSnapshot = parseOrderFinanceSnapshot(order.financeSnapshotJson);

  const openAccountInvoice = await prisma.financeInvoice.findFirst({
    where: { siteId: auth.siteId, orderId: order.id },
    select: {
      id: true,
      status: true,
      dueDate: true,
      totalMinor: true,
      issueDate: true,
    },
  });

  const carrierProvider = order.carrier ? parseCarrierConfig(order.carrier.configJson).provider : null;
  const showHepsijet = carrierProvider === "hepsijet" || order.carrier?.code === "hepsijet";

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-[var(--kn-brand)] underline">
        ← Siparişler
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Sipariş {order.orderNumber}</h1>
      <p className="mt-1">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${orderSourceBadgeClass(order.marketplacePlatform)}`}
        >
          {orderSourceLabel(order)}
        </span>
      </p>
      <p className="text-sm text-zinc-500">
        {statusLabel(order.status)} · {new Date(order.createdAt).toLocaleString("tr-TR")}
      </p>
      <p className="mt-2">
        <Link
          href={`/admin/orders/labels/print?ids=${order.id}`}
          className="inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          Kargo etiketi yazdır
        </Link>
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Müşteri</h2>
          <p className="mt-2 text-sm">{order.customerName ?? "—"}</p>
          <p className="text-sm text-zinc-600">{order.customerEmail}</p>
          <p className="text-sm text-zinc-600">{order.customerPhone}</p>
          {order.customerId ? (
            <p className="mt-2">
              <Link href={`/admin/customers/${order.customerId}`} className="text-sm text-[var(--kn-brand)] underline">
                Müşteri kartı →
              </Link>
            </p>
          ) : null}
          <OrderDeliveryBlock
            shippingAddressJson={order.shippingAddressJson}
            billingAddressJson={order.billingAddressJson}
            billingTaxId={order.billingTaxId}
            billingTaxOffice={order.billingTaxOffice}
            carrierName={order.carrier?.name ?? null}
            trackingUrlTemplate={order.carrier?.trackingUrlTemplate ?? null}
            trackingNumber={order.trackingNumber}
          />
          <h2 className="mt-6 font-semibold">Ürünler</h2>
          <OrderLinesPanel lines={order.lines} />
          <p className="mt-4 text-right font-semibold">Toplam: {formatTry(order.totalMinor)}</p>
        </div>
        <OrderDetailForm
          orderId={order.id}
          initialStatus={order.status}
          initialCarrierId={order.carrierId ?? ""}
          initialTracking={order.trackingNumber ?? ""}
          initialNotes={order.adminNotes ?? ""}
          carriers={carriers.map((c) => ({
            id: c.id,
            name: c.name,
            trackingUrlTemplate: c.trackingUrlTemplate,
          }))}
          invoiceComplete={isOrderInvoiceComplete(order.invoiceStatus)}
        />
      </div>
      <OrderInvoicePanel
        orderId={order.id}
        orderNumber={order.orderNumber}
        marketplacePlatform={order.marketplacePlatform}
        invoiceStatus={order.invoiceStatus}
        invoiceNumber={order.invoiceNumber}
        invoiceLink={order.invoiceLink}
        invoiceIssuedAt={order.invoiceIssuedAt}
        efaturaEnabled={efaturaConfig.enabled}
        efaturaReady={efaturaReady(efaturaConfig)}
        focusInvoice={focusInvoice}
        defaultRecipientTaxId={order.billingTaxId}
      />
      <OrderFinancePanel
        orderId={order.id}
        orderNumber={order.orderNumber}
        marketplacePlatform={order.marketplacePlatform}
        paymentMethod={order.paymentMethod}
        financeSnapshot={financeSnapshot}
        transactions={financeTransactions}
        openAccountInvoice={openAccountInvoice}
      />
      {order.marketplacePlatform && order.marketplaceMetaJson ? (
        <MarketplaceOrderPanel
          orderId={order.id}
          platform={order.marketplacePlatform}
          metaJson={order.marketplaceMetaJson}
        />
      ) : (
        <>
          {showHepsijet ? (
            <HepsijetOrderPanel
              orderId={order.id}
              marketplacePlatform={order.marketplacePlatform}
              showHepsijet={showHepsijet}
            />
          ) : (
            <GeliverOrderPanel orderId={order.id} marketplacePlatform={order.marketplacePlatform} />
          )}
        </>
      )}
    </div>
  );
}
