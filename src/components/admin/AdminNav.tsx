"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ADMIN_NAV_GROUPS,
  filterNavGroups,
  isNavItemActive,
  type AdminNavGroup,
  type AdminNavLink,
  type NavBadgeKey,
} from "@/lib/admin/nav";
import type { NavBadges } from "@/lib/admin/nav-badges";

function isLinkActive(pathname: string, search: URLSearchParams, href: string, locationHash = "") {
  const hashIdx = href.indexOf("#");
  const frag = hashIdx >= 0 ? href.slice(hashIdx) : "";
  const hrefPath = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  const [base, query] = hrefPath.split("?");

  if (frag) {
    if (!pathname.startsWith(base)) return false;
    return locationHash === frag;
  }

  if (pathname.startsWith(base) && locationHash.startsWith("#") && hrefPath === "/admin/integrations/payments") {
    return false;
  }

  if (!pathname.startsWith(base)) return false;
  if (query) {
    const want = new URLSearchParams(query);
    for (const [k, v] of want.entries()) {
      if (search.get(k) !== v) return false;
    }
    return true;
  }
  if (base === "/admin/orders" && pathname.startsWith("/admin/orders")) {
    return !search.get("status");
  }
  if (base === "/admin/integrations") {
    if (
      pathname.startsWith("/admin/integrations/payments") ||
      pathname.startsWith("/admin/integrations/emails")
    ) {
      return false;
    }
    if (!pathname.startsWith("/admin/integrations")) return false;
    const wantPlatform = query ? new URLSearchParams(query).get("platform") : null;
    if (wantPlatform) return search.get("platform") === wantPlatform;
    return pathname === "/admin/integrations" && !search.get("platform");
  }
  if (base === "/admin/dashboard" || base === "/admin/analytics") return pathname === base;
  return pathname === base || pathname.startsWith(`${base}/`);
}

function defaultOpenGroups(
  pathname: string,
  search: URLSearchParams,
  groups: AdminNavGroup[],
  locationHash = "",
) {
  const open = new Set<string>();
  for (const g of groups) {
    if (g.collapsedByDefault) continue;
    if (g.items.some((i) => isNavItemActive(pathname, search, i, (p, s, h) => isLinkActive(p, s, h, locationHash))))
      open.add(g.id);
  }
  for (const g of groups) {
    if (g.items.some((i) => isNavItemActive(pathname, search, i, (p, s, h) => isLinkActive(p, s, h, locationHash))))
      open.add(g.id);
  }
  if (
    pathname.startsWith("/admin/products") ||
    pathname.includes("/categories") ||
    pathname.includes("/brands") ||
    pathname.includes("/collections")
  ) {
    open.add("products");
  }
  if (pathname.startsWith("/admin/orders")) open.add("orders");
  if (pathname.startsWith("/admin/integrations/payments")) open.add("payments");
  else if (pathname.startsWith("/admin/integrations/emails")) open.add("notifications");
  else if (pathname.startsWith("/admin/integrations")) open.add("marketplace");
  if (pathname.startsWith("/admin/campaigns")) open.add("marketing");
  if (
    pathname.startsWith("/admin/customers") ||
    pathname.startsWith("/admin/customer-groups") ||
    pathname.startsWith("/admin/settings/users")
  ) {
    open.add("customers");
  }
  if (pathname.startsWith("/admin/shipping")) open.add("shipping");
  if (pathname.startsWith("/admin/analytics") || pathname.startsWith("/admin/reports")) {
    open.add("reports");
  }
  if (pathname.startsWith("/admin/settings/store")) open.add("settings");
  if (
    pathname.startsWith("/admin/theme") ||
    pathname.startsWith("/admin/settings/seo") ||
    pathname.startsWith("/admin/settings/menu") ||
    pathname.startsWith("/admin/settings/navigation") ||
    pathname.startsWith("/admin/settings/cookie-consents")
  ) {
    open.add("settings");
  }
  if (
    pathname.startsWith("/admin/pages") ||
    pathname.startsWith("/admin/home") ||
    pathname.startsWith("/admin/pages/vitrin") ||
    pathname.startsWith("/admin/pages/edit/")
  ) {
    open.add("pages");
  }
  if (!open.size) open.add("overview");
  return open;
}

function NavLinkRow({
  item,
  pathname,
  searchParams,
  badges,
  nested,
  locationHash,
}: {
  item: AdminNavLink;
  pathname: string;
  searchParams: URLSearchParams;
  badges: NavBadges;
  nested?: boolean;
  locationHash: string;
}) {
  const active = isLinkActive(pathname, searchParams, item.href, locationHash);
  return (
    <Link
      href={item.href}
      target={item.href.startsWith("/admin") ? undefined : "_blank"}
      rel={item.href.startsWith("/admin") ? undefined : "noopener noreferrer"}
      className={`admin-nav-link flex items-center justify-between gap-2${nested ? " admin-nav-link--nested" : ""}`}
      data-active={active}
    >
      <span>{item.label}</span>
      <span className="flex shrink-0 items-center gap-1">
        {item.soon ? <span className="admin-badge admin-badge--muted">Yakında</span> : null}
        {item.badgeKey && badges[item.badgeKey as NavBadgeKey] > 0 ? (
          <span className="admin-badge">{badges[item.badgeKey as NavBadgeKey]}</span>
        ) : null}
      </span>
    </Link>
  );
}

export function AdminNav({
  permissions,
  badges,
}: {
  permissions: readonly string[];
  badges: NavBadges;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasPerm = (key: string) => permissions.includes(key);
  const groups = useMemo(() => filterNavGroups(ADMIN_NAV_GROUPS, hasPerm), [permissions]);

  const [locationHash, setLocationHash] = useState("");
  useEffect(() => {
    const sync = () => setLocationHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  const [open, setOpen] = useState<Set<string>>(() =>
    defaultOpenGroups(pathname, searchParams, groups, locationHash),
  );

  useEffect(() => {
    setOpen((prev) => {
      const next = new Set(prev);
      for (const id of defaultOpenGroups(pathname, searchParams, groups, locationHash)) next.add(id);
      return next;
    });
  }, [pathname, searchParams, groups, locationHash]);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <nav className="admin-nav-scroll" aria-label="Admin menü">
      {groups.map((g) => {
        const canToggle = g.items.length > 1 || Boolean(g.collapsedByDefault);
        const expanded =
          open.has(g.id) || (g.items.length === 1 && !g.collapsedByDefault);
        return (
          <div key={g.id} className="admin-nav-group">
            {canToggle ? (
              <button
                type="button"
                className="admin-nav-group-label"
                data-open={expanded}
                onClick={() => toggle(g.id)}
                aria-expanded={expanded}
              >
                <span>{g.label}</span>
                <span aria-hidden>{expanded ? "▾" : "▸"}</span>
              </button>
            ) : (
              <div className="admin-nav-group-label" style={{ cursor: "default" }}>
                <span>{g.label}</span>
              </div>
            )}
            {expanded ? (
              <div className="admin-nav-items">
                {g.items.map((item) => {
                  const hasChildren = Boolean(item.children?.length);
                  return (
                    <div key={`${g.id}-${item.href}-${item.label}`} className="admin-nav-branch">
                      <NavLinkRow
                        item={item}
                        pathname={pathname}
                        searchParams={searchParams}
                        badges={badges}
                        locationHash={locationHash}
                      />
                      {hasChildren ? (
                        <div className="admin-nav-children">
                          {item.children!.map((child) => (
                            <NavLinkRow
                              key={`${g.id}-${item.href}-${child.href}`}
                              item={child}
                              pathname={pathname}
                              searchParams={searchParams}
                              badges={badges}
                              nested
                              locationHash={locationHash}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
