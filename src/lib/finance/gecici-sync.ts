/**
 * InvoiceEntry kayıtlarından geçici vergi matrahını hesaplar ve
 * ilgili TaxObligation (gecici) kayıtlarını günceller.
 * Geçici vergi kümülatiftir: her dönem Ocak 1'den dönem sonuna kadar hesaplanır.
 */
import { prisma } from "@/lib/prisma";
import { calcProgressiveIncomeTax, DEFAULT_INCOME_BRACKETS_2026, type IncomeBracket } from "./tax";

export async function syncGeciciObligations(
  siteId: string,
  year: number,
  brackets: IncomeBracket[] = DEFAULT_INCOME_BRACKETS_2026,
): Promise<void> {
  const janStart = new Date(Date.UTC(year, 0, 1));

  for (let q = 1; q <= 4; q++) {
    const periodKey = `gecici-${year}-${q}`;
    const endMonth = q * 3;
    const periodEnd = new Date(Date.UTC(year, endMonth, 1)); // exclusive (start of next month)

    const entries = await prisma.invoiceEntry.findMany({
      where: { siteId, invoiceDate: { gte: janStart, lt: periodEnd } },
    });

    let outgoingNet = 0;
    let incomingNet = 0;

    for (const e of entries) {
      if (e.direction === "outgoing") outgoingNet += e.netMinor;
      else incomingNet += e.netMinor;
    }

    const baseMinor = outgoingNet - incomingNet; // net kazanç (kuruş)
    const baseTL = baseMinor / 100;

    const taxResult =
      baseTL > 0 ? calcProgressiveIncomeTax(baseTL, brackets) : { tax: 0, breakdown: [], effectiveRate: 0 };

    const taxMinor = Math.round(taxResult.tax * 100);

    const ob = await prisma.taxObligation.findFirst({ where: { siteId, periodKey } });
    if (!ob) continue;

    await prisma.taxObligation.update({
      where: { id: ob.id },
      data: {
        baseMinor: Math.max(0, baseMinor),
        taxMinor,
        calcJson: JSON.stringify({
          outgoingNet,
          incomingNet,
          baseMinor,
          baseTL,
          taxTL: taxResult.tax,
          effectiveRate: taxResult.effectiveRate,
          breakdown: taxResult.breakdown,
          quarter: q,
          note: "Geçici vergi kümülatif: Ocak→dönem sonu. Bu brüt vergidir; önceki geçici ödemeler düşülmeli.",
        }),
        updatedAt: new Date(),
      },
    });
  }
}
