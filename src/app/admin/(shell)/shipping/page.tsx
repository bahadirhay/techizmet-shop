import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function ShippingPage() {
  const auth = await requireStaffPage();
  const carriers = await prisma.shippingCarrier.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { rates: true } } },
  });

  return (
    <div>
      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        Otomatik kargo (Geliver) için{" "}
        <Link href="/admin/integrations/shipping" className="font-medium underline">
          Geliver Entegrasyonu
        </Link>{" "}
        sayfasına gidin — yalnızca API token yeterli. Bu listedeki firmalar manuel takip içindir.
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Kargo firmaları</h1>
          <p className="mt-1 text-sm text-zinc-500">API bilgileri, takip şablonu ve fiyat tarifeleri</p>
        </div>
        <Link
          href="/admin/shipping/new"
          className="rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white"
        >
          + Yeni firma
        </Link>
      </div>
      <ul className="mt-6 divide-y rounded-xl border bg-white">
        {carriers.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">
                {c.name}{" "}
                <span className="text-xs font-normal text-zinc-500">({c.code})</span>
              </p>
              <p className="text-sm text-zinc-500">
                {c._count.rates} tarife · {c.active ? "Aktif" : "Pasif"}
              </p>
            </div>
            <Link href={`/admin/shipping/${c.id}`} className="text-sm text-[var(--kn-brand)]">
              Düzenle
            </Link>
          </li>
        ))}
      </ul>
      {carriers.length === 0 ? (
        <p className="mt-8 text-zinc-500">
          Henüz kargo firması yok. Seed çalıştırdıysanız veya yeni firma ekleyin.
        </p>
      ) : null}
    </div>
  );
}
