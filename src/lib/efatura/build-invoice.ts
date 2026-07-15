import type { InvoiceDetails, InvoiceItem } from "fatura";
import { normalizeConsumerTaxId } from "@/lib/efatura/consumer-tax-id";
import type { ResolvedEfaturaConfig } from "@/lib/efatura/settings";
import { dedupeAddressSegments } from "@/lib/tr-address/format";

type OrderLine = {
  title: string;
  qty: number;
  lineMinor: number;
  discountMinor?: number;
  vatRate?: number | null;
};

type ShippingAddress = {
  line1?: string;
  city?: string;
  district?: string;
  postalCode?: string;
};

function minorToTry(minor: number): number {
  return Math.round(minor) / 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function splitCustomerName(full: string | null | undefined): { name: string; surname: string; title: string } {
  const t = (full ?? "Müşteri").trim() || "Müşteri";
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { name: "", surname: "", title: t };
  return { name: parts[0]!, surname: parts.slice(1).join(" "), title: t };
}

function formatGibDate(d: Date): { date: string; time: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  };
}

function lineItemFromMinor(
  name: string,
  qty: number,
  lineMinorInclVat: number,
  vatRate: number,
): InvoiceItem {
  const incl = minorToTry(lineMinorInclVat);
  const ex = round2(incl / (1 + vatRate / 100));
  const vat = round2(incl - ex);
  const unitEx = qty > 0 ? round2(ex / qty) : ex;
  return {
    name: name.slice(0, 200),
    quantity: qty,
    unitPrice: unitEx,
    price: ex,
    VATRate: vatRate,
    VATAmount: vat,
  };
}

export function buildInvoiceDetailsFromOrder(
  order: {
    orderNumber: string;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    shippingAddressJson: string | null;
    billingAddressJson?: string | null;
    billingTaxId?: string | null;
    billingTaxOffice?: string | null;
    shippingMinor: number;
    discountMinor: number;
    totalMinor: number;
    createdAt: Date;
    lines: OrderLine[];
  },
  config: ResolvedEfaturaConfig,
  recipientTaxId?: string,
): InvoiceDetails {
  const defaultVatRate = config.defaultVatRate;
  const { date, time } = formatGibDate(new Date());
  const customer = splitCustomerName(order.customerName);

  let address: ShippingAddress = {};
  const billingRaw = order.billingAddressJson?.trim();
  const addressJson = billingRaw || order.shippingAddressJson;
  if (addressJson) {
    try {
      address = JSON.parse(addressJson) as ShippingAddress;
    } catch {
      address = {};
    }
  }

  // Yalnızca sokak/cadde satırı. İlçe, şehir ve posta kodu GİB'de (ve ön izlemede)
  // ayrı alanlara yazıldığı için burada tekrar EKLENMEZ — aksi halde adres çift çıkar.
  const fullAddress = dedupeAddressSegments(address.line1);

  const items: InvoiceItem[] = order.lines.map((l) => {
    const rate = l.vatRate ?? defaultVatRate;
    return lineItemFromMinor(
      l.title,
      l.qty,
      Math.max(0, l.lineMinor - (l.discountMinor ?? 0)),
      rate,
    );
  });

  if (order.shippingMinor > 0) {
    items.push(lineItemFromMinor("Kargo", 1, order.shippingMinor, defaultVatRate));
  }

  let grandTotalInclVAT = round2(items.reduce((s, i) => s + (i.price ?? 0) + (i.VATAmount ?? 0), 0));
  const orderTotal = minorToTry(order.totalMinor);
  if (Math.abs(grandTotalInclVAT - orderTotal) > 0.05 && orderTotal > 0) {
    grandTotalInclVAT = orderTotal;
  }

  const grandTotal = round2(items.reduce((s, i) => s + (i.price ?? 0), 0));
  const totalVAT = round2(grandTotalInclVAT - grandTotal);

  return {
    date,
    time,
    orderNumber: order.orderNumber,
    taxIDOrTRID: normalizeConsumerTaxId(
      recipientTaxId?.trim() || order.billingTaxId,
      config.defaultConsumerTaxId,
    ),
    title: customer.title,
    name: customer.name,
    surname: customer.surname,
    fullAddress: fullAddress || "Türkiye",
    city: address.city ?? "",
    district: address.district ?? "",
    zipCode: address.postalCode ?? "",
    phoneNumber: order.customerPhone ?? "",
    email: order.customerEmail ?? "",
    taxOffice: order.billingTaxOffice?.trim() || "",
    items,
    totalVAT,
    grandTotal,
    grandTotalInclVAT,
    paymentTotal: grandTotalInclVAT,
  };
}
