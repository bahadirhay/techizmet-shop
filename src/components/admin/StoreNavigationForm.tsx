"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import type { SiteSettings } from "@/lib/site-settings";
import {
  DEFAULT_FOOTER_BOTTOM_LINKS,
  DEFAULT_STORE_FOOTER,
  PAYMENT_ICON_IDS,
  type FooterBottomLink,
  type FooterLinkItem,
  type FooterMenuColumn,
  type PaymentIconId,
  type StoreFooterConfig,
} from "@/lib/store-footer";
import type {
  NavDropdownColumn,
  NavDropdownLink,
  NavDropdownMode,
  StoreNavItem,
} from "@/lib/store-navigation";

function newNavItem(): StoreNavItem {
  return {
    id: crypto.randomUUID(),
    href: "/",
    labelTr: "Yeni link",
    labelEn: "New link",
    visible: true,
    dropdown: "none",
  };
}

function newDropdownLink(): NavDropdownLink {
  return {
    id: crypto.randomUUID(),
    href: "/",
    labelTr: "Alt link",
    labelEn: "Sub link",
  };
}

function newDropdownColumn(): NavDropdownColumn {
  return {
    id: crypto.randomUUID(),
    titleTr: "Sütun başlığı",
    titleEn: "Column title",
    links: [],
  };
}

function newFooterLink(): FooterLinkItem {
  return {
    id: crypto.randomUUID(),
    href: "/",
    labelTr: "Yeni link",
    labelEn: "New link",
  };
}

function newBottomLink(): FooterBottomLink {
  return {
    id: crypto.randomUUID(),
    href: "/",
    labelTr: "Yeni link",
    labelEn: "New link",
  };
}

function newFooterColumn(): FooterMenuColumn {
  return {
    id: crypto.randomUUID(),
    titleTr: "Yeni sütun",
    titleEn: "New column",
    links: [],
  };
}

function initFooter(initial: SiteSettings): StoreFooterConfig {
  const f = initial.theme?.footer;
  if (!f?.columns?.length) return DEFAULT_STORE_FOOTER;
  return {
    ...f,
    bottomLinks: f.bottomLinks?.length ? f.bottomLinks : DEFAULT_FOOTER_BOTTOM_LINKS,
    paymentIcons: f.paymentIcons ?? [...PAYMENT_ICON_IDS],
  };
}

export function StoreNavigationForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [items, setItems] = useState<StoreNavItem[]>(
    initial.theme?.navItems?.length ? initial.theme.navItems : [],
  );
  const [footer, setFooter] = useState<StoreFooterConfig>(() => initFooter(initial));
  const [cookieConsentJson, setCookieConsentJson] = useState(initial.cookieConsentJson ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateNav(id: string, patch: Partial<StoreNavItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function removeNav(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateNavColumn(itemId: string, colId: string, patch: Partial<NavDropdownColumn>) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        return {
          ...i,
          columns: (i.columns ?? []).map((c) => (c.id === colId ? { ...c, ...patch } : c)),
        };
      }),
    );
  }

  function addNavColumn(itemId: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, columns: [...(i.columns ?? []), newDropdownColumn()] } : i,
      ),
    );
  }

  function removeNavColumn(itemId: string, colId: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, columns: (i.columns ?? []).filter((c) => c.id !== colId) } : i,
      ),
    );
  }

  function updateNavColLink(
    itemId: string,
    colId: string,
    linkId: string,
    patch: Partial<NavDropdownLink>,
  ) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        return {
          ...i,
          columns: (i.columns ?? []).map((c) =>
            c.id !== colId
              ? c
              : {
                  ...c,
                  links: c.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
                },
          ),
        };
      }),
    );
  }

  function addNavColLink(itemId: string, colId: string) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        return {
          ...i,
          columns: (i.columns ?? []).map((c) =>
            c.id === colId ? { ...c, links: [...c.links, newDropdownLink()] } : c,
          ),
        };
      }),
    );
  }

  function removeNavColLink(itemId: string, colId: string, linkId: string) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        return {
          ...i,
          columns: (i.columns ?? []).map((c) =>
            c.id === colId ? { ...c, links: c.links.filter((l) => l.id !== linkId) } : c,
          ),
        };
      }),
    );
  }

  function moveNav(id: string, dir: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }

  function updateFooter(patch: Partial<StoreFooterConfig>) {
    setFooter((prev) => ({ ...prev, ...patch }));
  }

  function updateColumn(colId: string, patch: Partial<FooterMenuColumn>) {
    setFooter((prev) => ({
      ...prev,
      columns: (prev.columns ?? []).map((c) => (c.id === colId ? { ...c, ...patch } : c)),
    }));
  }

  function removeColumn(colId: string) {
    setFooter((prev) => ({
      ...prev,
      columns: (prev.columns ?? []).filter((c) => c.id !== colId),
    }));
  }

  function moveColumn(colId: string, dir: -1 | 1) {
    setFooter((prev) => {
      const cols = [...(prev.columns ?? [])];
      const idx = cols.findIndex((c) => c.id === colId);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= cols.length) return prev;
      [cols[idx], cols[next]] = [cols[next], cols[idx]];
      return { ...prev, columns: cols };
    });
  }

  function updateLink(colId: string, linkId: string, patch: Partial<FooterLinkItem>) {
    setFooter((prev) => ({
      ...prev,
      columns: (prev.columns ?? []).map((c) =>
        c.id !== colId
          ? c
          : {
              ...c,
              links: c.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
            },
      ),
    }));
  }

  function removeLink(colId: string, linkId: string) {
    setFooter((prev) => ({
      ...prev,
      columns: (prev.columns ?? []).map((c) =>
        c.id !== colId ? c : { ...c, links: c.links.filter((l) => l.id !== linkId) },
      ),
    }));
  }

  function moveLink(colId: string, linkId: string, dir: -1 | 1) {
    setFooter((prev) => ({
      ...prev,
      columns: (prev.columns ?? []).map((c) => {
        if (c.id !== colId) return c;
        const links = [...c.links];
        const idx = links.findIndex((l) => l.id === linkId);
        if (idx < 0) return c;
        const next = idx + dir;
        if (next < 0 || next >= links.length) return c;
        [links[idx], links[next]] = [links[next], links[idx]];
        return { ...c, links };
      }),
    }));
  }

  function updateBottomLink(linkId: string, patch: Partial<FooterBottomLink>) {
    setFooter((prev) => ({
      ...prev,
      bottomLinks: (prev.bottomLinks ?? []).map((l) => (l.id === linkId ? { ...l, ...patch } : l)),
    }));
  }

  function removeBottomLink(linkId: string) {
    setFooter((prev) => ({
      ...prev,
      bottomLinks: (prev.bottomLinks ?? []).filter((l) => l.id !== linkId),
    }));
  }

  function moveBottomLink(linkId: string, dir: -1 | 1) {
    setFooter((prev) => {
      const links = [...(prev.bottomLinks ?? [])];
      const idx = links.findIndex((l) => l.id === linkId);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= links.length) return prev;
      [links[idx], links[next]] = [links[next], links[idx]];
      return { ...prev, bottomLinks: links };
    });
  }

  function togglePaymentIcon(icon: PaymentIconId) {
    setFooter((prev) => {
      const current = prev.paymentIcons ?? [...PAYMENT_ICON_IDS];
      const has = current.includes(icon);
      return {
        ...prev,
        paymentIcons: has ? current.filter((i) => i !== icon) : [...current, icon],
      };
    });
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const payload: SiteSettings = {
      ...initial,
      cookieConsentJson: cookieConsentJson.trim() || null,
      theme: {
        ...initial.theme,
        footer: {
          ...footer,
          columns: (footer.columns ?? []).map((col) => ({
            ...col,
            links: col.links.map((l) => ({ ...l, href: l.href.trim() })),
          })),
        },
      },
    };
    const res = await fetch("/api/admin/integrations/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    setMsg(res.ok ? "Kaydedildi. Vitrini yenileyin." : "Kayıt başarısız");
    if (res.ok) router.refresh();
  }

  async function resetNav() {
    setBusy(true);
    const res = await fetch("/api/admin/navigation/reset", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const data = (await res.json()) as { items: StoreNavItem[] };
      setItems(data.items);
      setMsg("Varsayılan üst menü yüklendi.");
      router.refresh();
    }
  }

  function resetFooter() {
    setFooter({
      ...DEFAULT_STORE_FOOTER,
      bottomLinks: DEFAULT_FOOTER_BOTTOM_LINKS,
      paymentIcons: [...PAYMENT_ICON_IDS],
    });
    setMsg("Footer varsayılanına döndü — Kaydet ile uygulayın.");
  }

  const columns = footer.columns ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-xl border bg-amber-50/60 p-6">
        <h2 className="font-semibold">Üst menü (header)</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Mega menü ve kategori ağacı artık{" "}
          <a href="/admin/settings/menu" className="font-medium underline">
            Ayarlar & Sistem → Menü & Kategoriler
          </a>{" "}
          sayfasından yönetilir (web-page ile aynı yapı: üst öğe → sütun → alt link).
        </p>
      </section>

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Çerez bildirimi (KVKK)</h2>
        <p className="text-sm text-zinc-600">
          web-page projesindeki ile aynı JSON yapısı. Boş bırakırsanız varsayılan metinler kullanılır. Kayıtlar{" "}
          <a href="/admin/settings/cookie-consents" className="underline">
            çerez onay logları
          </a>{" "}
          sayfasında listelenir.
        </p>
        <label className="block text-sm">
          cookieConsentJson
          <textarea
            className="mt-1 w-full rounded border px-3 py-2 font-mono text-xs"
            rows={12}
            value={cookieConsentJson}
            onChange={(e) => setCookieConsentJson(e.target.value)}
            placeholder='{"enabled":true,"title":"Çerez kullanıyoruz.",...}'
          />
        </label>
      </section>

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Alt bilgi (footer)</h2>
        <p className="text-sm text-zinc-600">
          Sol taraftaki açıklama metni, sağ üstteki slogan ve alt menü sütunları (ekle / sil / sırala).
        </p>

        <label className="block text-sm">
          Açıklama metni (TR)
          <textarea
            className="mt-1 w-full rounded border px-3 py-2"
            rows={4}
            value={footer.introTr ?? ""}
            onChange={(e) => updateFooter({ introTr: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Intro text (EN)
          <textarea
            className="mt-1 w-full rounded border px-3 py-2"
            rows={4}
            value={footer.introEn ?? ""}
            onChange={(e) => updateFooter({ introEn: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Slogan (TR)
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={footer.taglineTr ?? ""}
            onChange={(e) => updateFooter({ taglineTr: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          Tagline (EN)
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={footer.taglineEn ?? ""}
            onChange={(e) => updateFooter({ taglineEn: e.target.value })}
          />
        </label>

        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-medium">Menü sütunları</h3>
          {columns.map((col, colIndex) => (
            <div key={col.id} className="rounded-lg border border-zinc-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-500">Sütun #{colIndex + 1}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={colIndex === 0}
                    onClick={() => moveColumn(col.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={colIndex === columns.length - 1}
                    onClick={() => moveColumn(col.id, 1)}
                  >
                    ↓
                  </button>
                  <button type="button" className={btnSecondary} onClick={() => removeColumn(col.id)}>
                    Sütunu sil
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  Başlık (TR)
                  <input
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={col.titleTr}
                    onChange={(e) => updateColumn(col.id, { titleTr: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  Title (EN)
                  <input
                    className="mt-1 w-full rounded border px-3 py-2"
                    value={col.titleEn}
                    onChange={(e) => updateColumn(col.id, { titleEn: e.target.value })}
                  />
                </label>
              </div>

              <div className="space-y-2 pl-2 border-l-2 border-zinc-200">
                {col.links.map((link, linkIndex) => (
                  <div key={link.id} className="rounded border bg-zinc-50/80 p-3 space-y-2">
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        className={btnSecondary}
                        disabled={linkIndex === 0}
                        onClick={() => moveLink(col.id, link.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={btnSecondary}
                        disabled={linkIndex === col.links.length - 1}
                        onClick={() => moveLink(col.id, link.id, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => removeLink(col.id, link.id)}
                      >
                        Sil
                      </button>
                    </div>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={link.href}
                      placeholder="/pages/contact"
                      onChange={(e) => updateLink(col.id, link.id, { href: e.target.value })}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        className="rounded border px-3 py-2 text-sm"
                        value={link.labelTr}
                        placeholder="TR"
                        onChange={(e) => updateLink(col.id, link.id, { labelTr: e.target.value })}
                      />
                      <input
                        className="rounded border px-3 py-2 text-sm"
                        value={link.labelEn}
                        placeholder="EN"
                        onChange={(e) => updateLink(col.id, link.id, { labelEn: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() =>
                    updateColumn(col.id, { links: [...col.links, newFooterLink()] })
                  }
                >
                  + Link ekle
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondary}
            onClick={() =>
              updateFooter({ columns: [...columns, newFooterColumn()] })
            }
          >
            + Menü sütunu ekle
          </button>
          {(() => {
            const existingIds = new Set(columns.map((c) => c.id));
            const missing = (DEFAULT_STORE_FOOTER.columns ?? []).filter(
              (c) => !existingIds.has(c.id),
            );
            if (!missing.length) return null;
            return (
              <button
                type="button"
                className={btnSecondary}
                title={`Eklenecek: ${missing.map((c) => c.titleTr).join(", ")}`}
                onClick={() =>
                  updateFooter({
                    columns: [
                      ...columns,
                      ...missing.map((c) => ({
                        ...c,
                        links: c.links.map((l) => ({ ...l, id: crypto.randomUUID() })),
                      })),
                    ],
                  })
                }
              >
                + Şablon sütunlarını ekle ({missing.map((c) => c.titleTr).join(", ")})
              </button>
            );
          })()}
        </div>

        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-medium">Alt bar linkleri</h3>
          <p className="text-xs text-zinc-500">
            Footer&apos;ın en alt satırındaki politika bağlantıları (Gizlilik, Hizmet şartları, vb.)
          </p>
          {(footer.bottomLinks ?? []).map((link, linkIndex) => {
            const blinks = footer.bottomLinks ?? [];
            return (
              <div key={link.id} className="rounded border bg-zinc-50/80 p-3 space-y-2">
                <div className="flex gap-1 justify-end">
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={linkIndex === 0}
                    onClick={() => moveBottomLink(link.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={linkIndex === blinks.length - 1}
                    onClick={() => moveBottomLink(link.id, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => removeBottomLink(link.id)}
                  >
                    Sil
                  </button>
                </div>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={link.href}
                  placeholder="/policies/privacy-policy.html"
                  onChange={(e) => updateBottomLink(link.id, { href: e.target.value })}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="rounded border px-3 py-2 text-sm"
                    value={link.labelTr}
                    placeholder="TR"
                    onChange={(e) => updateBottomLink(link.id, { labelTr: e.target.value })}
                  />
                  <input
                    className="rounded border px-3 py-2 text-sm"
                    value={link.labelEn}
                    placeholder="EN"
                    onChange={(e) => updateBottomLink(link.id, { labelEn: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className={btnSecondary}
            onClick={() =>
              setFooter((prev) => ({
                ...prev,
                bottomLinks: [...(prev.bottomLinks ?? []), newBottomLink()],
              }))
            }
          >
            + Alt bar linki ekle
          </button>
        </div>

        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-medium">Ödeme ikonları</h3>
          <p className="text-xs text-zinc-500">
            Footer sağ alt köşesinde görünen ödeme yöntemi ikonları
          </p>
          <div className="flex flex-wrap gap-3">
            {PAYMENT_ICON_IDS.map((icon) => {
              const checked = (footer.paymentIcons ?? [...PAYMENT_ICON_IDS]).includes(icon);
              return (
                <label key={icon} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePaymentIcon(icon)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm capitalize">{icon}</span>
                </label>
              );
            })}
          </div>
        </div>

        <button type="button" className={btnSecondary} disabled={busy} onClick={resetFooter}>
          Footer varsayılana dön
        </button>
      </section>

      {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}
      <button type="button" className={btnPrimary} disabled={busy} onClick={save}>
        {busy ? "Kaydediliyor…" : "Tümünü kaydet"}
      </button>
    </div>
  );
}
