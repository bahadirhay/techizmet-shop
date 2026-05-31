import Link from "next/link";
import { StaffUserPasswordForm } from "@/components/admin/StaffUserPasswordForm";
import { parsePermissionsJson, hasStaffPermission } from "@/lib/staff-permissions";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function StaffUsersPage() {
  const auth = await requireStaffPage();
  const canManageUsers = hasStaffPermission(auth.permissions, "users.manage");

  const [users, roles, memberCount, groups] = await Promise.all([
    prisma.shopStaffUser.findMany({
      where: { siteId: auth.siteId },
      orderBy: { username: "asc" },
      include: { roleAssignments: { include: { role: true } } },
    }),
    prisma.shopStaffRole.findMany({
      where: { siteId: auth.siteId },
      orderBy: { slug: "asc" },
    }),
    prisma.storeCustomer.count({
      where: { siteId: auth.siteId, passwordHash: { not: null } },
    }),
    prisma.customerGroup.count({ where: { siteId: auth.siteId, active: true } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Kullanıcılar & roller</h1>
      <p className="mt-2 text-sm text-zinc-600">
        <strong>Panel kullanıcıları</strong> admin girişi içindir.{" "}
        <strong>Mağaza üyeleri</strong> vitrinde kayıt olur; siz gruba atayarak indirim tanımlarsınız.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/customers?segment=members" className="rounded-xl border bg-white p-4 hover:border-zinc-400">
          <p className="text-2xl font-bold">{memberCount}</p>
          <p className="text-sm text-zinc-500">Kayıtlı mağaza üyesi</p>
        </Link>
        <Link href="/admin/customer-groups" className="rounded-xl border bg-white p-4 hover:border-zinc-400">
          <p className="text-2xl font-bold">{groups}</p>
          <p className="text-sm text-zinc-500">Üye grubu (indirim)</p>
        </Link>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-2xl font-bold">{users.length}</p>
          <p className="text-sm text-zinc-500">Panel kullanıcısı</p>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Panel kullanıcıları (admin girişi)</h2>
      <p className="text-sm text-zinc-500">
        Kendi şifreniz için{" "}
        <Link href="/admin/settings/security" className="text-[var(--kn-brand)] underline">
          Güvenlik & şifre
        </Link>
        .
      </p>
      <ul className="mt-4 space-y-3">
        {users.map((u) => (
          <li key={u.id} className="rounded-xl border bg-white p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <strong>{u.username}</strong>
                {u.id === auth.staffUserId ? (
                  <span className="ml-2 text-xs text-zinc-500">(siz)</span>
                ) : null}
                <p className="mt-1 text-xs text-zinc-500">
                  {u.roleAssignments.map((a) => a.role.label).join(", ") || "—"} ·{" "}
                  {u.active ? "Aktif" : "Pasif"}
                </p>
              </div>
            </div>
            {canManageUsers && u.id !== auth.staffUserId ? (
              <StaffUserPasswordForm userId={u.id} username={u.username} />
            ) : null}
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-lg font-semibold">Mağaza üyesi → gruba atama</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
        <li>
          Müşteri <Link href="/account/register" className="underline" target="_blank">kayıt olur</Link>
        </li>
        <li>
          Siz{" "}
          <Link href="/admin/customer-groups" className="text-[var(--kn-brand)] underline">
            üye grubu
          </Link>{" "}
          oluşturursunuz (örn. %15 Bayi)
        </li>
        <li>
          <Link href="/admin/customers" className="text-[var(--kn-brand)] underline">
            Müşteri listesi
          </Link>{" "}
          veya müşteri kartından gruba atarsınız
        </li>
        <li>Üye giriş yapınca indirimli fiyatları görür ve o fiyattan satın alır</li>
      </ol>

      <h2 className="mt-10 text-lg font-semibold">Panel rolleri & yetkiler</h2>
      <ul className="mt-4 space-y-3">
        {roles.map((r) => {
          const perms = parsePermissionsJson(r.permissionsJson);
          return (
            <li key={r.id} className="rounded-xl border bg-white p-4 text-sm">
              <strong>{r.label}</strong> <span className="text-zinc-400">({r.slug})</span>
              <p className="mt-2 text-xs text-zinc-500">
                {perms.length} yetki — {perms.slice(0, 6).join(", ")}
                {perms.length > 6 ? "…" : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
