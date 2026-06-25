import Link from "next/link";
import { ShippingCarriersList } from "@/components/admin/ShippingCarriersList";
import { parseCarrierConfig } from "@/lib/shipping/carrier-config";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function ShippingPage() {
  const auth = await requireStaffPage();
  const carriers = await prisma.shippingCarrier.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { rates: true } } },
  });

  const rows = carriers.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    active: c.active,
    provider: parseCarrierConfig(c.configJson).provider,
    rateCount: c._count.rates,
  }));

  return (
    <div>
      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <strong>HepsiJet doğrudan API:</strong>{" "}
        <Link href="/admin/shipping/new?preset=hepsijet" className="font-medium underline">
          HepsiJet ekle
        </Link>{" "}
        — API bilgilerini girin, aktif/pasif ve tarifeyi buradan yönetin.{" "}
        <Link href="/admin/integrations/shipping" className="underline">
          Geliver
        </Link>{" "}
        isteğe bağlı (çoklu firma pazaryeri).
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Kargo firmaları</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Aktif firmalar ödeme sayfasında listelenir. HepsiJet API ile otomatik etiket ve takip.
          </p>
        </div>
        <Link
          href="/admin/shipping/new"
          className="rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white"
        >
          + Yeni firma
        </Link>
      </div>
      <ShippingCarriersList carriers={rows} />
      {carriers.length === 0 ? (
        <p className="mt-8 text-zinc-500">Henüz kargo firması yok. HepsiJet veya manuel firma ekleyin.</p>
      ) : null}
    </div>
  );
}
