import Link from "next/link";
import { Suspense } from "react";
import type { StaffAccess } from "@/lib/staff-auth";
import type { NavBadges } from "@/lib/admin/nav-badges";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminSearch } from "@/components/admin/AdminSearch";
import "@/styles/admin.css";

export function ShopAdminShell({
  children,
  auth,
  navBadges,
}: {
  children: React.ReactNode;
  auth: StaffAccess;
  navBadges: NavBadges;
}) {
  return (
    <div className="admin-shell flex">
      <aside className="admin-sidebar hidden shrink-0 md:flex">
        <div className="admin-sidebar-brand">
          <Link href="/admin/dashboard">Techizmet Shop</Link>
          <p className="admin-sidebar-user">{auth.username}</p>
        </div>
        <Suspense fallback={<div className="admin-nav-scroll p-4 text-sm text-zinc-400">Menü…</div>}>
          <AdminNav permissions={auth.permissions} badges={navBadges} />
        </Suspense>
        <div className="admin-nav-footer">
          <Link href="/" className="admin-nav-link" target="_blank" rel="noopener">
            Vitrini aç →
          </Link>
          <Link href="/admin/login" className="admin-nav-link mt-1 text-zinc-500">
            Oturum
          </Link>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <AdminMobileNav
            permissions={auth.permissions}
            badges={navBadges}
            username={auth.username}
          />
          <p className="hidden truncate text-sm font-medium text-zinc-700 sm:block md:hidden">
            Techizmet Shop
          </p>
          <Suspense fallback={null}>
            <AdminSearch className="admin-search hidden sm:block" />
          </Suspense>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/"
              target="_blank"
              className="hidden rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-600 hover:bg-zinc-50 sm:inline-block"
            >
              Vitrin
            </Link>
            <span className="hidden text-zinc-400 md:inline">{auth.username}</span>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
