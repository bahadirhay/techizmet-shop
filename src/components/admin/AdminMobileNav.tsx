"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import type { NavBadges } from "@/lib/admin/nav-badges";

export function AdminMobileNav({
  permissions,
  badges,
  username,
}: {
  permissions: readonly string[];
  badges: NavBadges;
  username: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="admin-menu-toggle md:hidden"
        aria-expanded={open}
        aria-label="Menüyü aç"
        onClick={() => setOpen((v) => !v)}
      >
        ☰ Menü
      </button>
      {open ? (
        <div
          className="admin-mobile-backdrop md:hidden"
          role="presentation"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside className={`admin-mobile-drawer md:hidden ${open ? "admin-mobile-drawer--open" : ""}`}>
        <div className="admin-sidebar-brand">
          <Link href="/admin/dashboard" onClick={() => setOpen(false)}>
            Techizmet Shop
          </Link>
          <p className="admin-sidebar-user">{username}</p>
        </div>
        <div className="admin-nav-scroll" onClick={() => setOpen(false)}>
          <AdminNav permissions={permissions} badges={badges} />
        </div>
        <div className="admin-nav-footer">
          <Link href="/" className="admin-nav-link" target="_blank" rel="noopener">
            Vitrini aç →
          </Link>
        </div>
      </aside>
    </>
  );
}
