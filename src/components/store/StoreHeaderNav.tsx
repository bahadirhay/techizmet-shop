"use client";

import Link from "next/link";
import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";

/** Mirror header navigasyonu — birebir class'lar (header38c6.css tarafından biçimlenir) */
export function StoreHeaderNav({ items }: { items: ResolvedNavItem[] }) {
  return (
    <div className="header--navigation-main" data-menus-container>
      <div className="header--navigation">
        <div className="header--navigation-inner">
          <ul className="d-flex width-100 header--navigation-list">
            {items.map((item) => {
              const hasDropdown = Boolean(item.columns?.length || item.children?.length);
              if (!hasDropdown) {
                return (
                  <li key={item.href} className="header--menu-item">
                    <Link href={item.href} className="header--menu-link heading-font text-small">
                      {item.label}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={item.href} className="header--menu-item has-children kn-has-dropdown">
                  <Link href={item.href} className="header--menu-link heading-font text-small">
                    {item.label}
                    <svg className="kn-menu-caret" width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path
                        d="M1 1l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                  <div className="kn-dropdown-panel">
                    {item.columns?.length ? (
                      <div className="kn-dropdown-columns">
                        {item.columns.map((col) => (
                          <div key={col.title} className="kn-dropdown-col">
                            {col.title ? <p className="kn-dropdown-title">{col.title}</p> : null}
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
                      <ul className="kn-dropdown-list">
                        {item.children?.map((l) => (
                          <li key={l.href}>
                            <Link href={l.href}>{l.label}</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
