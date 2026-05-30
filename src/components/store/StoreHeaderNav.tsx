"use client";

import Link from "next/link";
import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";

export function StoreHeaderNav({ items }: { items: ResolvedNavItem[] }) {
  return (
    <nav className="kn-header__nav" aria-label="Main menu">
      <ul className="kn-header-nav-list">
        {items.map((item) => {
          const hasDropdown = Boolean(item.columns?.length || item.children?.length);
          if (!hasDropdown) {
            return (
              <li key={item.href} className="kn-header-nav-item">
                <Link href={item.href}>{item.label}</Link>
              </li>
            );
          }
          return (
            <li key={item.href} className="kn-header-nav-item kn-header-nav-item--dropdown">
              <Link href={item.href}>{item.label}</Link>
              <div className="kn-header-nav-dropdown">
                <div className="kn-header-nav-dropdown__panel">
                  {item.columns?.length ? (
                    <div className="kn-header-nav-dropdown__columns">
                      {item.columns.map((col) => (
                        <div key={col.title} className="kn-header-nav-dropdown__col">
                          {col.title ? <p className="kn-header-nav-dropdown__title">{col.title}</p> : null}
                          <ul>
                            {col.links.map((l) => (
                              <li key={l.href}>
                                <Link href={l.href}>{l.label}</Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul>
                      {item.children?.map((l) => (
                        <li key={l.href}>
                          <Link href={l.href}>{l.label}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
