import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

const SEGMENTS = [
  { id: "all", label: "Tümü" },
  { id: "members", label: "Üyeler (şifreli)" },
  { id: "guests", label: "Misafir alıcılar" },
  { id: "vip", label: "Sık alışveriş (3+ sipariş)" },
  { id: "inactive", label: "Siparişi yok" },
] as const;

type SegmentId = (typeof SEGMENTS)[number]["id"];

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string }>;
}) {
  const auth = await requireStaffPage();
  const { segment: segRaw } = await searchParams;
  const segment: SegmentId = SEGMENTS.some((s) => s.id === segRaw)
    ? (segRaw as SegmentId)
    : "all";

  const all = await prisma.storeCustomer.findMany({
    where: { siteId: auth.siteId },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      customerGroup: true,
      _count: { select: { orders: true } },
    },
  });

  const customers = all.filter((c) => {
    const orders = c._count.orders;
    const isMember = Boolean(c.passwordHash);
    switch (segment) {
      case "members":
        return isMember;
      case "guests":
        return !isMember && orders > 0;
      case "vip":
        return orders >= 3;
      case "inactive":
        return orders === 0;
      default:
        return true;
    }
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Müşteriler & üyeler</h1>
      <p className="mt-1 text-sm text-zinc-500">
        CRM segmentleri — müşteri kartına tıklayarak sipariş ve adres geçmişi
      </p>
      <div className="mt-3">
        <Link
          href="/admin/customers/new"
          className="inline-flex rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Müşteri / üye ekle
        </Link>
      </div>

      <nav className="mt-4 flex flex-wrap gap-2">
        {SEGMENTS.map((s) => (
          <Link
            key={s.id}
            href={s.id === "all" ? "/admin/customers" : `/admin/customers?segment=${s.id}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              segment === s.id
                ? "border-zinc-800 bg-zinc-800 text-white"
                : "bg-white text-zinc-700 hover:border-zinc-400"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <p className="mt-4 text-sm text-zinc-500">
        {customers.length} kayıt · segment: {SEGMENTS.find((s) => s.id === segment)?.label}
      </p>

      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="border-b text-zinc-500">
            <th className="py-2">Ad</th>
            <th>E-posta</th>
            <th>Üyelik</th>
            <th>Grup</th>
            <th>Sipariş</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="py-2">
                <Link href={`/admin/customers/${c.id}`} className="font-medium text-[var(--kn-brand)] underline">
                  {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Müşteri"}
                </Link>
              </td>
              <td>{c.email ?? "—"}</td>
              <td>{c.passwordHash ? "Üye" : "Misafir"}</td>
              <td>
                {c.customerGroup ? `${c.customerGroup.name} (%${c.customerGroup.discountPercent})` : "—"}
              </td>
              <td>{c._count.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {customers.length === 0 ? <p className="mt-8 text-zinc-500">Bu segmentte kayıt yok.</p> : null}
    </div>
  );
}
