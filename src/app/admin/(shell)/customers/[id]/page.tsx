import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerDetailForm } from "@/components/admin/CustomerDetailForm";
import { CustomerGrantPanelAccess } from "@/components/admin/CustomerGrantPanelAccess";
import { CustomerGroupAssign } from "@/components/admin/CustomerGroupAssign";
import { CustomerPasswordForm } from "@/components/admin/CustomerPasswordForm";
import { formatTry } from "@/lib/admin/money";
import { ORDER_STATUSES } from "@/lib/admin/marketplace-platforms";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

function statusLabel(id: string) {
  return ORDER_STATUSES.find((s) => s.id === id)?.label ?? id;
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffPage();
  const { id } = await params;

  const [customer, groups] = await Promise.all([
    prisma.storeCustomer.findFirst({
      where: { id, siteId: auth.siteId },
      include: {
        customerGroup: true,
        addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
        orders: { orderBy: { createdAt: "desc" }, take: 30 },
        _count: { select: { favorites: true } },
      },
    }),
    prisma.customerGroup.findMany({
      where: { siteId: auth.siteId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, discountPercent: true },
    }),
  ]);
  if (!customer) notFound();

  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div>
      <Link href="/admin/customers" className="text-sm text-[var(--kn-brand)] underline">
        ← Müşteriler
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{name}</h1>
      <p className="text-sm text-zinc-500">
        {customer.email ?? "E-posta yok"} · {customer.phone ?? "Telefon yok"} · Kayıt:{" "}
        {new Date(customer.createdAt).toLocaleString("tr-TR")}
        {customer.passwordHash ? " · Üyelik: aktif" : " · Misafir (şifre yok)"}
        {customer.customerGroup
          ? ` · Grup: ${customer.customerGroup.name} (%${customer.customerGroup.discountPercent})`
          : ""}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Özet</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Sipariş</dt>
              <dd>{customer.orders.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Favori ürün</dt>
              <dd>{customer._count.favorites}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Kayıtlı adres</dt>
              <dd>{customer.addresses.length}</dd>
            </div>
          </dl>

          <h2 className="mt-8 font-semibold">Adresler</h2>
          {customer.addresses.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Adres yok</p>
          ) : (
            <ul className="mt-2 space-y-3 text-sm">
              {customer.addresses.map((a) => (
                <li key={a.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                  <strong>{a.label || "Adres"}</strong>
                  {a.isDefault ? <span className="ml-2 text-xs text-green-700">varsayılan</span> : null}
                  <p className="mt-1 text-zinc-600">
                    {a.line1}, {a.district} / {a.city}
                    {a.postalCode ? ` · ${a.postalCode}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <CustomerGrantPanelAccess
            auth={auth}
            customer={{
              id: customer.id,
              email: customer.email,
              firstName: customer.firstName,
              lastName: customer.lastName,
              passwordHash: customer.passwordHash,
            }}
          />
          <div className="rounded-xl border bg-white p-6">
            <CustomerGroupAssign
              customerId={customer.id}
              groups={groups}
              currentGroupId={customer.customerGroupId}
            />
          </div>
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-semibold">Üye şifresi</h2>
            <div className="mt-3">
              <CustomerPasswordForm
                customerId={customer.id}
                email={customer.email}
                hasPassword={Boolean(customer.passwordHash)}
              />
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6">
            <CustomerDetailForm customerId={customer.id} initialNotes={customer.notes ?? ""} />
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Sipariş geçmişi</h2>
        {customer.orders.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Henüz sipariş yok</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="border-b text-zinc-500">
                <th className="py-2">No</th>
                <th>Durum</th>
                <th>Tutar</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {customer.orders.map((o) => (
                <tr key={o.id} className="border-b">
                  <td className="py-2">
                    <Link href={`/admin/orders/${o.id}`} className="text-[var(--kn-brand)] underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td>{statusLabel(o.status)}</td>
                  <td>{formatTry(o.totalMinor)}</td>
                  <td className="text-zinc-500">{new Date(o.createdAt).toLocaleString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
