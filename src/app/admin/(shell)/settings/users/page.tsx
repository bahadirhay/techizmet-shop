import Link from "next/link";

import { StaffUsersPageCallout } from "@/components/admin/StaffUsersPageCallout";

import { StaffUsersPanel } from "@/components/admin/StaffUsersPanel";

import { hasStaffPermission, parsePermissionsJson } from "@/lib/staff-permissions";

import { requireStaffPage } from "@/lib/staff-auth";

import { ensureDefaultStaffRoles } from "@/lib/staff-role-presets";

import { suggestStaffUsernameFromEmail } from "@/lib/staff-users-guard";

import { prisma } from "@/lib/prisma";



function isAdminStaff(roleSlug: string): boolean {

  return roleSlug.split(",").some((s) => s.trim() === "admin");

}



export default async function StaffUsersPage({

  searchParams,

}: {

  searchParams: Promise<{ email?: string; name?: string; customerId?: string }>;

}) {

  const auth = await requireStaffPage();

  const sp = await searchParams;

  const canManageUsers = hasStaffPermission(auth.permissions, "users.manage");



  if (canManageUsers || isAdminStaff(auth.roleSlug)) {

    await ensureDefaultStaffRoles(prisma, auth.siteId);

  }



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



  const roleOptions = roles.map((r) => ({

    id: r.id,

    slug: r.slug,

    label: r.label,

    permissions: parsePermissionsJson(r.permissionsJson),

  }));



  const userOptions = users.map((u) => ({

    id: u.id,

    username: u.username,

    displayName: u.displayName,

    active: u.active,

    roleIds: u.roleAssignments.map((a) => a.roleId),

  }));



  const email = sp.email?.trim().toLowerCase();

  const createPrefill =

    canManageUsers && email

      ? {

          username: suggestStaffUsernameFromEmail(email),

          displayName: sp.name?.trim() || email,

          autoOpen: true,

        }

      : null;



  return (

    <div>

      <h1 className="text-2xl font-semibold">Personel & Panel Yetkileri</h1>

      <p className="mt-2 text-sm text-zinc-600">

        <strong>Panel kullanıcıları</strong> — <code className="text-xs">/admin</code> girişi ve

        menü yetkileri. <strong>Mağaza üyeleri</strong> — vitrin kaydı ve indirim grupları (ayrı

        sistem).

      </p>



      <StaffUsersPageCallout canManage={canManageUsers} />



      {sp.customerId && email && canManageUsers ? (

        <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">

          Müşteri kartından yönlendirildiniz ({email}). Aşağıdaki formda rolleri seçip panel

          şifresi belirleyin.

        </p>

      ) : null}



      <div className="mt-6 grid gap-4 sm:grid-cols-3">

        <Link

          href="/admin/customers?segment=members"

          className="rounded-xl border bg-white p-4 hover:border-zinc-400"

        >

          <p className="text-2xl font-bold">{memberCount}</p>

          <p className="text-sm text-zinc-500">Kayıtlı mağaza üyesi</p>

        </Link>

        <Link

          href="/admin/customer-groups"

          className="rounded-xl border bg-white p-4 hover:border-zinc-400"

        >

          <p className="text-2xl font-bold">{groups}</p>

          <p className="text-sm text-zinc-500">Üye grubu (indirim)</p>

        </Link>

        <div className="rounded-xl border bg-white p-4">

          <p className="text-2xl font-bold">{users.length}</p>

          <p className="text-sm text-zinc-500">Panel kullanıcısı</p>

        </div>

      </div>



      <h2 className="mt-10 text-lg font-semibold">Panel kullanıcıları</h2>

      <p className="text-sm text-zinc-500">

        Kendi şifreniz:{" "}

        <Link href="/admin/settings/security" className="text-[var(--kn-brand)] underline">

          Güvenlik & Şifre

        </Link>

        .

      </p>



      <StaffUsersPanel

        users={userOptions}

        roles={roleOptions}

        currentUserId={auth.staffUserId}

        canManage={canManageUsers}

        createPrefill={createPrefill}

      />



      <h2 className="mt-10 text-lg font-semibold">Mağaza üyesi → indirim grubu</h2>

      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-zinc-700">

        <li>

          Müşteri{" "}

          <Link href="/account/register" className="underline" target="_blank">

            kayıt olur

          </Link>

        </li>

        <li>

          <Link href="/admin/customer-groups" className="text-[var(--kn-brand)] underline">

            Üye grubu

          </Link>{" "}

          (örn. %15 bayi)

        </li>

        <li>

          <Link href="/admin/customers" className="text-[var(--kn-brand)] underline">

            Müşteri listesi

          </Link>

          → gruba ata

        </li>

      </ol>

    </div>

  );

}


