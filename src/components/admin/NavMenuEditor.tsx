"use client";

import type { NavMenuItem } from "@prisma/client";
import { NavMenuLinkFields } from "@/components/admin/NavMenuLinkFields";
import type { NavLinkType } from "@/lib/nav-menu-link";
import {
  encodeNavLinkTarget,
  NAV_MEGA_PRODUCTS_MAX,
  parseNavLinkTarget,
  type NavMenuMegaMeta,
} from "@/lib/nav-menu-link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

type NavProductOption = { slug: string; title: string };

function menuOf(i: NavMenuItem) {
  return i.menuSlug ?? "header";
}

function siblingsOf(items: NavMenuItem[], parentId: string | null, slug: string) {
  return items
    .filter((i) => menuOf(i) === slug && (i.parentId ?? null) === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.labelTr.localeCompare(b.labelTr));
}

async function reorder(parentId: string | null, orderedIds: string[]) {
  await fetch("/api/admin/nav-menu/reorder", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentId, orderedIds }),
  });
}

function linkTypeLabel(linkType: string) {
  switch (linkType) {
    case "none":
      return "Sadece başlık";
    case "page":
      return "Sayfa";
    case "category":
      return "Kategori";
    case "collection":
      return "Koleksiyon";
    case "product":
      return "Ürün";
    case "collections_auto":
      return "Otomatik koleksiyonlar";
    default:
      return "Özel URL";
  }
}

async function uploadNavImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
  const json = (await res.json()) as { error?: string; media?: { url: string } };
  if (!res.ok || !json.media?.url) {
    throw new Error(json.error ?? "Görsel yüklenemedi");
  }
  return json.media.url;
}

function MegaImageField({
  label,
  urlKey,
  titleTrKey,
  titleEnKey,
  mega,
  setMega,
  saveMega,
  titlePlaceholderTr,
  titlePlaceholderEn,
}: {
  label: string;
  urlKey: keyof NavMenuMegaMeta;
  titleTrKey?: keyof NavMenuMegaMeta;
  titleEnKey?: keyof NavMenuMegaMeta;
  mega: NavMenuMegaMeta;
  setMega: Dispatch<SetStateAction<NavMenuMegaMeta>>;
  saveMega: (next: NavMenuMegaMeta) => Promise<void>;
  titlePlaceholderTr?: string;
  titlePlaceholderEn?: string;
}) {
  const url = (mega[urlKey] as string | undefined) ?? "";
  const titleTr = titleTrKey ? ((mega[titleTrKey] as string | undefined) ?? "") : "";
  const titleEn = titleEnKey ? ((mega[titleEnKey] as string | undefined) ?? "") : "";

  return (
    <div className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3">
      <p className="text-xs font-medium text-zinc-800">{label}</p>
      <label className="grid gap-1 text-xs">
        Görsel URL
        <input
          className="rounded border border-zinc-300 px-2 py-1 text-sm"
          value={url}
          onChange={(e) => setMega((m) => ({ ...m, [urlKey]: e.target.value }))}
          onBlur={(e) => saveMega({ ...mega, [urlKey]: e.target.value })}
          placeholder="/uploads/shop/.../banner.jpg"
        />
        <input
          type="file"
          accept="image/*"
          className="text-xs"
          onChange={async (e) => {
            const input = e.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            try {
              const uploaded = await uploadNavImage(file);
              const nextMega = { ...mega, [urlKey]: uploaded };
              setMega(nextMega);
              await saveMega(nextMega);
            } catch (err) {
              alert(err instanceof Error ? err.message : "Yükleme hatası");
            } finally {
              input.value = "";
            }
          }}
        />
      </label>
      {titleTrKey && titleEnKey ? (
        <label className="grid gap-1 text-xs">
          Başlık (TR / EN)
          <input
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
            value={titleTr}
            onChange={(e) => setMega((m) => ({ ...m, [titleTrKey]: e.target.value }))}
            onBlur={(e) => saveMega({ ...mega, [titleTrKey]: e.target.value })}
            placeholder={titlePlaceholderTr}
          />
          <input
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
            value={titleEn}
            onChange={(e) => setMega((m) => ({ ...m, [titleEnKey]: e.target.value }))}
            onBlur={(e) => saveMega({ ...mega, [titleEnKey]: e.target.value })}
            placeholder={titlePlaceholderEn}
          />
        </label>
      ) : null}
    </div>
  );
}

function NavRow({
  item,
  depth,
  items,
  refresh,
  productOptions,
}: {
  item: NavMenuItem;
  depth: number;
  items: NavMenuItem[];
  refresh: () => void;
  productOptions: NavProductOption[];
}) {
  const [labelTr, setLabelTr] = useState(item.labelTr);
  const [labelEn, setLabelEn] = useState(item.labelEn);
  const [linkType, setLinkType] = useState(item.linkType);
  const parsedTarget = parseNavLinkTarget(item.linkTarget);
  const [linkTarget, setLinkTarget] = useState(parsedTarget.target);
  const [mega, setMega] = useState<NavMenuMegaMeta>(parsedTarget.mega);
  const [href, setHref] = useState(item.href);
  const [published, setPublished] = useState(item.published);
  const [openInNewTab, setOpenInNewTab] = useState(item.openInNewTab);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(depth === 0);

  const slug = menuOf(item);
  const sibs = siblingsOf(items, item.parentId ?? null, slug);
  const idx = sibs.findIndex((s) => s.id === item.id);
  const children = siblingsOf(items, item.id, slug);
  const childCount = children.length;

  const save = useCallback(
    async (linkPatch?: { linkType: NavLinkType; linkTarget: string | null; href?: string }) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/admin/nav-menu/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            labelTr,
            labelEn,
            linkType: linkPatch?.linkType ?? linkType,
            linkTarget: encodeNavLinkTarget(
              linkPatch?.linkTarget !== undefined ? linkPatch.linkTarget : linkTarget,
              depth === 0 ? mega : undefined,
            ),
            href: linkPatch?.href ?? href,
            published,
            openInNewTab,
          }),
        });
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          if (res.status === 404) {
            alert("Menü öğesi bulunamadı. Liste yenileniyor.");
            refresh();
            return;
          }
          alert(d.error ?? "Kaydedilemedi");
          return;
        }
        refresh();
      } finally {
        setSaving(false);
      }
    },
    [item.id, labelTr, labelEn, linkType, linkTarget, href, published, openInNewTab, refresh, depth, mega],
  );

  const saveMega = useCallback(
    async (nextMega: NavMenuMegaMeta) => {
      const res = await fetch(`/api/admin/nav-menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labelTr,
          labelEn,
          linkType,
          linkTarget: encodeNavLinkTarget(linkTarget, depth === 0 ? nextMega : undefined),
          href,
          published,
          openInNewTab,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 404) {
          alert("Menü öğesi bulunamadı. Liste yenileniyor.");
          refresh();
          return;
        }
        alert(d.error ?? "Kaydedilemedi");
        return;
      }
      refresh();
    },
    [item.id, labelTr, labelEn, linkType, linkTarget, depth, href, published, openInNewTab, refresh],
  );

  const syncFromCategory = async () => {
    if (
      !confirm(
        "Alt sütunlar ve linkler kategori ağacından yeniden yazılacak (mevcut alt menü silinir). Devam?",
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/nav-menu/${item.id}/sync-category`, { method: "POST" });
      const d = (await res.json().catch(() => ({}))) as {
        error?: string;
        columnCount?: number;
        linkCount?: number;
      };
      if (!res.ok) {
        alert(d.error ?? "Senkron başarısız");
        return;
      }
      alert(
        `Kategori ağacı aktarıldı (${d.columnCount ?? "?"} sütun, ${d.linkCount ?? "?"} link). Vitrini yenileyin.`,
      );
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const move = async (dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= sibs.length) return;
    const next = [...sibs];
    const t = next[idx]!;
    next[idx] = next[j]!;
    next[j] = t;
    await reorder(item.parentId ?? null, next.map((x) => x.id));
    refresh();
  };

  const addChild = async () => {
    await fetch("/api/admin/nav-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentId: item.id,
        labelTr: depth === 0 ? "Sütun başlığı" : "Alt link",
        labelEn: depth === 0 ? "Column title" : "Sub link",
        linkType: depth === 0 ? "none" : "url",
        linkTarget: null,
        href: depth === 0 ? "#" : "/",
        published: true,
        menuSlug: slug,
      }),
    });
    refresh();
  };

  const remove = async () => {
    if (!confirm("Bu öğe ve tüm alt menüler silinsin mi?")) return;
    await fetch(`/api/admin/nav-menu/${item.id}`, { method: "DELETE" });
    refresh();
  };

  const depthHint =
    depth === 0
      ? "Üst menü (hover ile açılır)"
      : depth === 1
        ? "Mega menü sütunu — altına link ekleyin"
        : "Sütun altı link";

  const summaryBits =
    depth === 1 && childCount === 0
      ? ["Sadece sütun başlığı"]
      : [linkTypeLabel(linkType), linkTarget ? linkTarget : null];
  if (childCount > 0) summaryBits.push(`${childCount} alt öğe`);
  const summaryText = summaryBits.filter(Boolean).join(" • ");

  return (
    <div className="space-y-2">
      <div
        className={`rounded-xl border bg-white p-3 shadow-sm ${
          published ? "border-zinc-200" : "border-amber-300 bg-amber-50/40"
        }`}
        style={{ marginLeft: depth * 16 }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition ${
            published ? "bg-zinc-50 hover:bg-zinc-100" : "bg-amber-100/60 hover:bg-amber-100"
          }`}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-zinc-500">{depthHint}</p>
            <p className="truncate text-sm font-semibold text-zinc-900">
              {labelTr || labelEn || "Adsız menü"}
              {!published ? (
                <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                  Taslak
                </span>
              ) : null}
            </p>
            {summaryText ? <p className="truncate text-xs text-zinc-500">{summaryText}</p> : null}
          </div>
          <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600">
            {expanded ? "Daralt" : "Aç"}
          </span>
        </button>

        {expanded ? (
          <div className="mt-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs">
                Türkçe etiket
                <input
                  className="rounded border border-zinc-300 px-2 py-1 text-sm"
                  value={labelTr}
                  onChange={(e) => setLabelTr(e.target.value)}
                  onBlur={() => save()}
                />
              </label>
              <label className="grid gap-1 text-xs">
                English label
                <input
                  className="rounded border border-zinc-300 px-2 py-1 text-sm"
                  value={labelEn}
                  onChange={(e) => setLabelEn(e.target.value)}
                  onBlur={() => save()}
                />
              </label>
              <NavMenuLinkFields
                item={item}
                onSave={(patch) => {
                  if (patch.linkType) setLinkType(patch.linkType);
                  if (patch.linkTarget !== undefined) setLinkTarget(patch.linkTarget);
                  if (patch.href) setHref(patch.href);
                  save(patch);
                }}
              />
            </div>
            {depth === 0 && linkType === "category" && linkTarget ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3">
                <p className="text-xs font-medium text-emerald-900">Kategori mega menü</p>
                <p className="mt-1 text-[11px] text-emerald-800">
                  Alt sütun yoksa vitrin otomatik doldurulur. Elle düzenlediyseniz veya ağaç
                  değiştiyse aşağıdan yenileyin.
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900"
                  onClick={syncFromCategory}
                  disabled={saving}
                >
                  Kategori ağacından yenile
                </button>
              </div>
            ) : null}
            {depth === 0 ? (
              <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-2">
                <p className="sm:col-span-2 text-xs font-medium text-zinc-700">
                  Mega menü — vitrin paneli (görsel veya ürün)
                </p>
                <p className="sm:col-span-2 text-[11px] text-zinc-600">
                  Boş sütun otomatik ürün ızgarası olur. Karşı tarafta 4 ürün (2 satır) varsa denge
                  için aynı sütuna alt alta iki görsel ekleyin. Her iki sütunda da görsel varsa
                  ürünler altta kayar.
                </p>
                <MegaImageField
                  label="Sol sütun — üst görsel (boşsa ürünler)"
                  urlKey="featuredImageUrl"
                  titleTrKey="featuredTitleTr"
                  titleEnKey="featuredTitleEn"
                  mega={mega}
                  setMega={setMega}
                  saveMega={saveMega}
                  titlePlaceholderTr="Yeni Gelenler"
                  titlePlaceholderEn="New Arrivals"
                />
                <MegaImageField
                  label="Sol sütun — alt görsel (4 ürün karşıda ise)"
                  urlKey="featuredImageUrl2"
                  titleTrKey="featuredTitle2Tr"
                  titleEnKey="featuredTitle2En"
                  mega={mega}
                  setMega={setMega}
                  saveMega={saveMega}
                  titlePlaceholderTr="Öne Çıkanlar"
                  titlePlaceholderEn="Highlights"
                />
                <MegaImageField
                  label="Sağ sütun — üst görsel (boşsa ürünler)"
                  urlKey="promoImageUrl"
                  titleTrKey="promoTitleTr"
                  titleEnKey="promoTitleEn"
                  mega={mega}
                  setMega={setMega}
                  saveMega={saveMega}
                  titlePlaceholderTr="Çok Satanlar"
                  titlePlaceholderEn="Best Sellers"
                />
                <MegaImageField
                  label="Sağ sütun — alt görsel (4 ürün karşıda ise)"
                  urlKey="promoImageUrl2"
                  titleTrKey="promoTitle2Tr"
                  titleEnKey="promoTitle2En"
                  mega={mega}
                  setMega={setMega}
                  saveMega={saveMega}
                  titlePlaceholderTr="Kampanyalar"
                  titlePlaceholderEn="Promotions"
                />
                <div className="sm:col-span-2 rounded-lg border border-zinc-200 bg-white p-3">
                  <p className="text-xs font-medium text-zinc-800">
                    Ürünler (en fazla {NAV_MEGA_PRODUCTS_MAX})
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Boş sütunlarda 2×2 ızgara. Karşı sütunda 2 görsel varsa yükseklik otomatik
                    hizalanır. Her iki sütunda görsel varsa ürünler altta kayar.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <select
                      className="min-w-[12rem] flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm"
                      value=""
                      onChange={async (e) => {
                        const slug = e.target.value;
                        if (!slug) return;
                        const current = mega.productSlugs ?? [];
                        if (current.includes(slug) || current.length >= NAV_MEGA_PRODUCTS_MAX) return;
                        const nextMega = { ...mega, productSlugs: [...current, slug] };
                        setMega(nextMega);
                        await saveMega(nextMega);
                        e.target.value = "";
                      }}
                    >
                      <option value="">+ Ürün ekle…</option>
                      {productOptions
                        .filter((p) => !(mega.productSlugs ?? []).includes(p.slug))
                        .map((p) => (
                          <option key={p.slug} value={p.slug}>
                            {p.title}
                          </option>
                        ))}
                    </select>
                  </div>
                  {(mega.productSlugs ?? []).length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {(mega.productSlugs ?? []).map((slug, idx) => {
                        const title = productOptions.find((p) => p.slug === slug)?.title ?? slug;
                        return (
                          <li
                            key={slug}
                            className="flex flex-wrap items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs"
                          >
                            <span className="min-w-0 flex-1 font-medium text-zinc-800">{title}</span>
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                className="rounded border px-1.5 py-0.5 disabled:opacity-40"
                                disabled={idx === 0}
                                onClick={async () => {
                                  const list = [...(mega.productSlugs ?? [])];
                                  [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
                                  const nextMega = { ...mega, productSlugs: list };
                                  setMega(nextMega);
                                  await saveMega(nextMega);
                                }}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="rounded border px-1.5 py-0.5 disabled:opacity-40"
                                disabled={idx === (mega.productSlugs ?? []).length - 1}
                                onClick={async () => {
                                  const list = [...(mega.productSlugs ?? [])];
                                  [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
                                  const nextMega = { ...mega, productSlugs: list };
                                  setMega(nextMega);
                                  await saveMega(nextMega);
                                }}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                className="rounded border border-red-200 px-1.5 py-0.5 text-red-700"
                                onClick={async () => {
                                  const nextMega = {
                                    ...mega,
                                    productSlugs: (mega.productSlugs ?? []).filter((s) => s !== slug),
                                  };
                                  setMega(nextMega);
                                  await saveMega(nextMega);
                                }}
                              >
                                Kaldır
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] text-zinc-500">Henüz ürün eklenmedi.</p>
                  )}
                </div>
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={async (e) => {
                    setPublished(e.target.checked);
                    await fetch(`/api/admin/nav-menu/${item.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ published: e.target.checked }),
                    });
                    refresh();
                  }}
                />
                Yayında
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={openInNewTab}
                  onChange={async (e) => {
                    setOpenInNewTab(e.target.checked);
                    await fetch(`/api/admin/nav-menu/${item.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ openInNewTab: e.target.checked }),
                    });
                    refresh();
                  }}
                />
                Yeni sekme
              </label>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="rounded-lg bg-zinc-100 px-2 py-1 text-xs" onClick={() => move(-1)} disabled={idx <= 0}>
                ↑
              </button>
              <button
                type="button"
                className="rounded-lg bg-zinc-100 px-2 py-1 text-xs"
                onClick={() => move(1)}
                disabled={idx >= sibs.length - 1}
              >
                ↓
              </button>
              {depth < 2 ? (
                <button
                  type="button"
                  className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900"
                  onClick={addChild}
                >
                  + {depth === 0 ? "Alt kategori / sütun" : "Alt link"}
                </button>
              ) : null}
              <button type="button" className="rounded-lg px-2 py-1 text-xs text-red-600" onClick={remove}>
                Sil
              </button>
              {saving ? <span className="text-xs text-zinc-400">Kaydediliyor…</span> : null}
            </div>
          </div>
        ) : null}
      </div>
      {expanded
        ? children.map((ch) => (
            <NavRow
              key={`${ch.id}:${ch.labelTr}:${ch.labelEn}:${ch.linkType}:${ch.linkTarget ?? ""}:${ch.href}:${ch.published ? 1 : 0}:${ch.openInNewTab ? 1 : 0}`}
              item={ch}
              depth={depth + 1}
              items={items}
              refresh={refresh}
              productOptions={productOptions}
            />
          ))
        : null}
    </div>
  );
}

export function NavMenuEditor({
  initialItems,
  categoryCount = 0,
}: {
  initialItems: NavMenuItem[];
  categoryCount?: number;
}) {
  const router = useRouter();
  const [menuSlug, setMenuSlug] = useState<"header" | "footer">("header");
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [productOptions, setProductOptions] = useState<NavProductOption[]>([]);

  useEffect(() => {
    fetch("/api/admin/nav-menu/options")
      .then((r) => r.json())
      .then((d: { products?: NavProductOption[] }) => {
        setProductOptions(Array.isArray(d.products) ? d.products : []);
      })
      .catch(() => setProductOptions([]));
  }, []);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);
  const items = initialItems;

  const roots = siblingsOf(items, null, menuSlug);

  const syncCategories = async () => {
    if (
      !confirm(
        "Ürün kategorileri «Kategoriler» menüsünün altına mega menü olarak yazılacak (mevcut alt sütunlar silinir). Devam?",
      )
    ) {
      return;
    }
    setSyncBusy(true);
    setSyncMsg(null);
    const res = await fetch("/api/admin/nav-menu/sync-categories", { method: "POST" });
    setSyncBusy(false);
    if (res.ok) {
      setSyncMsg("Kategoriler menüye aktarıldı. Vitrini yenileyin.");
      refresh();
    } else {
      const d = (await res.json()) as { error?: string };
      setSyncMsg(d.error ?? "Senkron başarısız");
    }
  };

  const addRoot = async () => {
    await fetch("/api/admin/nav-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentId: null,
        labelTr: menuSlug === "header" ? "Yeni kategori" : "Yeni alt bilgi linki",
        labelEn: menuSlug === "header" ? "New category" : "New footer link",
        href: "/",
        published: false,
        menuSlug,
      }),
    });
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-1">
        <button
          type="button"
          onClick={() => setMenuSlug("header")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            menuSlug === "header" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          Üst menü (header)
        </button>
        <button
          type="button"
          onClick={() => setMenuSlug("footer")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            menuSlug === "footer" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          Alt bilgi menüsü (footer)
        </button>
      </div>

      {menuSlug === "header" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-zinc-50 p-3">
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium"
            onClick={async () => {
              if (
                !confirm(
                  "Ana Sayfa, En Çok Satanlar, Kategoriler (+ kategori mega menü), Koleksiyonlar, Hakkında, İletişim yüklensin mi? Mevcut üst menü silinir.",
                )
              )
                return;
              await fetch("/api/admin/nav-menu/seed-default", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ replace: true }),
              });
              refresh();
            }}
          >
            Vitrin menüsünü yükle
          </button>
          <button
            type="button"
            disabled={syncBusy || categoryCount === 0}
            onClick={syncCategories}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {syncBusy ? "Aktarılıyor…" : "Kategoriler → mega menü"}
          </button>
          {syncMsg ? <span className="text-xs text-zinc-700">{syncMsg}</span> : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/80 p-4 text-sm text-zinc-700">
        <p className="font-medium text-zinc-900">Mega menü yapısı (referans site ile aynı)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>1. seviye</strong> — üst şerit (ör. SAÇ BAKIMI). Fareyle üzerine gelince açılır.
          </li>
          <li>
            <strong>2. seviye</strong> — sütun başlıkları (ör. ŞAMPUAN, SAÇ BAKIM). «+ Alt kategori / sütun» ile
            ekleyin.
          </li>
          <li>
            <strong>3. seviye</strong> — sütun altı linkler (ör. Günlük Şampuanlar).
          </li>
          <li>
            <strong>Sağ panel</strong> — kart başına görsel veya ürün (görsel yoksa o kart ürünlere
            ayrılır; ikisi de doluysa ürünler altta kayar).
          </li>
        </ul>
        <p className="mt-2 text-xs text-zinc-600">
          Mobil hamburger menü de bu <strong>Üst menü (header)</strong> listesini kullanır — ayrı mobil menü yok.
          Öğeyi silerseniz veya «Yayında» kapatırsanız masaüstü ve mobilde görünmez.
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          «Vitrin menüsünü yükle» kategorileri otomatik mega menüye yazar. Elle yapıyorsanız: 2. seviye = sütun, 3.
          seviye = link. Kaydettikten sonra vitrinde sayfayı yenileyin.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-zinc-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Menü öğeleri</p>
            <p className="text-xs text-zinc-500">
              Uzun listelerde bu alan kendi içinde kayar. Satırları Aç / Daralt ile yönetin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">{roots.length} öğe</span>
            <button
              type="button"
              onClick={addRoot}
              className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              + {menuSlug === "header" ? "Üst menüye" : "Alt bilgi menüsüne"} yeni öğe ekle
            </button>
          </div>
        </div>

        {roots.length === 0 ? (
          <p className="px-4 py-4 text-sm text-amber-900">Bu menüde henüz öğe yok. Sağ üstten ilk satırı ekleyin.</p>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto p-4">
            <div className="space-y-3">
              {roots.map((r) => (
                <NavRow
                  key={`${r.id}:${r.labelTr}:${r.labelEn}:${r.linkType}:${r.linkTarget ?? ""}:${r.href}:${r.published ? 1 : 0}:${r.openInNewTab ? 1 : 0}`}
                  item={r}
                  depth={0}
                  items={items}
                  refresh={refresh}
                  productOptions={productOptions}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
