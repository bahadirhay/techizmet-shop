/**
 * InvoiceEntry kayıtlarını ilgili TaxObligation (KDV) kaydına senkronize eder.
 * Fatura eklendiğinde veya silindiğinde çağrılır.
 */
import { prisma } from "@/lib/prisma";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export async function syncKdvObligation(
  siteId: string,
  year: number,
  month: number,
): Promise<void> {
  const periodKey = `kdv-${year}-${pad(month)}`;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1)); // exclusive

  const entries = await prisma.invoiceEntry.findMany({
    where: { siteId, invoiceDate: { gte: start, lt: end } },
  });

  let hesaplananKdv = 0; // Kesilen fatura KDV toplamı
  let indirilecekKdv = 0; // Gelen fatura KDV toplamı
  let outgoingNet = 0;
  let incomingNet = 0;

  for (const e of entries) {
    if (e.direction === "outgoing") {
      hesaplananKdv += e.kdvMinor;
      outgoingNet += e.netMinor;
    } else {
      indirilecekKdv += e.kdvMinor;
      incomingNet += e.netMinor;
    }
  }

  const netKdv = hesaplananKdv - indirilecekKdv;

  const ob = await prisma.taxObligation.findFirst({ where: { siteId, periodKey } });
  if (!ob) return; // Beyanname henüz oluşturulmamış

  await prisma.taxObligation.update({
    where: { id: ob.id },
    data: {
      baseMinor: outgoingNet,
      // taxMinor: sadece hesaplanan KDV; ödenecek/devreden hesabı UI'da (önceki ayın devredeni gerekli)
      taxMinor: Math.max(0, netKdv),
      calcJson: JSON.stringify({
        hesaplananKdv,
        indirilecekKdv,
        netKdv,
        outgoingNet,
        incomingNet,
        entryCount: entries.length,
      }),
      updatedAt: new Date(),
    },
  });
}

export async function syncKdvFromInvoiceDate(siteId: string, invoiceDate: Date): Promise<void> {
  const year = invoiceDate.getUTCFullYear();
  const month = invoiceDate.getUTCMonth() + 1;
  await syncKdvObligation(siteId, year, month);
}
