import "server-only";

import { efaturaReady, getEfaturaConfig } from "@/lib/efatura/settings";
import { getSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

export type OperationsChecklistItem = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
};

export type OperationsChecklistSnapshot = {
  items: OperationsChecklistItem[];
  completedCount: number;
  totalCount: number;
  allDone: boolean;
  /** Günlük operasyon kısayolları */
  quickLinks: { href: string; label: string; count?: number }[];
};

function shipFromComplete(settings: Awaited<ReturnType<typeof getSiteSettings>>): boolean {
  const s = settings.store?.shipFrom;
  return Boolean(s?.name?.trim() && s?.line1?.trim() && s?.city?.trim());
}

function efaturaSellerComplete(settings: Awaited<ReturnType<typeof getSiteSettings>>): boolean {
  const e = settings.efatura;
  return Boolean(e?.sellerTitle?.trim() && e?.sellerTaxId?.trim() && e?.sellerTaxOffice?.trim());
}

export async function loadOperationsChecklist(siteId: string): Promise<OperationsChecklistSnapshot> {
  const [carrierCount, settings, efaturaConfig, pendingCount, invoicePendingCount, preparingCount] =
    await Promise.all([
      prisma.shippingCarrier.count({ where: { siteId, active: true } }),
      getSiteSettings(siteId),
      getEfaturaConfig(siteId),
      prisma.storeOrder.count({
        where: { siteId, status: { in: ["pending", "confirmed"] } },
      }),
      prisma.storeOrder.count({
        where: {
          siteId,
          status: { in: ["shipped", "delivered"] },
          OR: [
            { invoiceStatus: null },
            { invoiceStatus: "none" },
            { invoiceStatus: "draft" },
          ],
        },
      }),
      prisma.storeOrder.count({ where: { siteId, status: "preparing" } }),
    ]);

  const items: OperationsChecklistItem[] = [
    {
      id: "carriers",
      label: "Kargo firması tanımlı",
      description: "Sipariş detayında firma seçebilmek için en az bir aktif kargo firması ekleyin.",
      done: carrierCount > 0,
      href: "/admin/shipping",
    },
    {
      id: "shipFrom",
      label: "Gönderici adresi kayıtlı",
      description: "Kargo etiketlerinde görünecek depo / mağaza adresi.",
      done: shipFromComplete(settings),
      href: "/admin/settings/store#kn-ship-from",
    },
    {
      id: "efaturaSeller",
      label: "Fatura satıcı bilgileri",
      description: "Unvan, VKN ve vergi dairesi e-Arşiv faturada kullanılır.",
      done: efaturaSellerComplete(settings),
      href: "/admin/settings/efatura",
    },
    {
      id: "efaturaGib",
      label: "GİB bağlantısı hazır",
      description: "e-Arşiv kesimi için kullanıcı kodu ve parola (veya GIB_PASSWORD ortam değişkeni).",
      done: efaturaConfig.enabled && efaturaReady(efaturaConfig),
      href: "/admin/settings/efatura",
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const quickLinks = [
    { href: "/admin/orders?status=pending", label: "Onay bekleyen", count: pendingCount || undefined },
    { href: "/admin/orders?status=preparing", label: "Hazırlanan", count: preparingCount || undefined },
    { href: "/admin/orders/labels", label: "Kargo etiketi bas" },
    { href: "/admin/orders?invoice=pending", label: "Fatura bekleyen", count: invoicePendingCount || undefined },
  ];

  return {
    items,
    completedCount,
    totalCount: items.length,
    allDone: completedCount === items.length,
    quickLinks,
  };
}
