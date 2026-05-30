"use client";

import type { NavMenuItem } from "@prisma/client";
import { useEffect, useState } from "react";
import { inferLinkType, parseNavLinkTarget, type NavLinkType } from "@/lib/nav-menu-link";

type Options = {
  pages: { key: string; label: string; href: string }[];
  categories: { id: string; slug: string; title: string; parentId: string | null }[];
  collections: { slug: string; title: string }[];
  products: { slug: string; title: string }[];
};

function categoryLabel(
  cat: { id: string; title: string; parentId: string | null },
  all: Options["categories"],
) {
  if (!cat.parentId) return cat.title;
  const parent = all.find((c) => c.id === cat.parentId);
  return parent ? `${parent.title} → ${cat.title}` : cat.title;
}

export function NavMenuLinkFields({
  item,
  onSave,
}: {
  item: NavMenuItem;
  onSave: (patch: {
    linkType: NavLinkType;
    linkTarget: string | null;
    href?: string;
  }) => void;
}) {
  const [options, setOptions] = useState<Options | null>(null);
  const [linkType, setLinkType] = useState<NavLinkType>(() => inferLinkType(item));
  const [linkTarget, setLinkTarget] = useState(parseNavLinkTarget(item.linkTarget).target ?? "");
  const [customHref, setCustomHref] = useState(item.href);

  useEffect(() => {
    fetch("/api/admin/nav-menu/options")
      .then((r) => r.json())
      .then((d: Options) => setOptions(d));
  }, []);

  function commit(patch: { linkType?: NavLinkType; linkTarget?: string; href?: string }) {
    const t = patch.linkType ?? linkType;
    const target = patch.linkTarget !== undefined ? patch.linkTarget : linkTarget;
    const href = patch.href ?? customHref;
    onSave({ linkType: t, linkTarget: target || null, href });
  }

  return (
    <div className="grid gap-2 sm:col-span-2">
      <label className="block text-xs font-medium text-zinc-600">
        Bağlantı türü
        <select
          className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-white"
          value={linkType}
          onChange={(e) => {
            const t = e.target.value as NavLinkType;
            setLinkType(t);
            setLinkTarget("");
            commit({ linkType: t, linkTarget: "" });
          }}
        >
          <option value="none">Sadece başlık (link yok)</option>
          <option value="page">Sayfa seç</option>
          <option value="category">Kategori seç (ürünler)</option>
          <option value="collection">Koleksiyon seç</option>
          <option value="product">Ürün seç</option>
          <option value="collections_auto">Koleksiyonlar — otomatik liste</option>
          <option value="url">Özel URL</option>
        </select>
      </label>

      {linkType === "none" ? (
        <p className="text-[11px] text-zinc-500 rounded border border-dashed p-2 bg-white">
          Bu öğe sadece <strong>başlık</strong> olarak görünür. Tıklanınca sayfa açılmaz.
        </p>
      ) : null}

      {linkType === "page" && options ? (
        <label className="block text-xs">
          Sayfa
          <select
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            value={linkTarget}
            onChange={(e) => {
              setLinkTarget(e.target.value);
              commit({ linkTarget: e.target.value });
            }}
          >
            <option value="">— Seçin —</option>
            {options.pages.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {linkType === "category" && options ? (
        <label className="block text-xs">
          Kategori (Ürün & Katalog)
          <select
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            value={linkTarget}
            onChange={(e) => {
              setLinkTarget(e.target.value);
              commit({ linkTarget: e.target.value });
            }}
          >
            <option value="">— Kategori seçin —</option>
            {options.categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {categoryLabel(c, options.categories)}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-zinc-500">
            Tıklanınca: /collections/all?category=… (o kategorideki ürünler)
          </span>
        </label>
      ) : null}

      {linkType === "collection" && options ? (
        <label className="block text-xs">
          Koleksiyon
          <select
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            value={linkTarget}
            onChange={(e) => {
              setLinkTarget(e.target.value);
              commit({ linkTarget: e.target.value });
            }}
          >
            <option value="">— Seçin —</option>
            {options.collections.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {linkType === "product" && options ? (
        <label className="block text-xs">
          Ürün
          <select
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            value={linkTarget}
            onChange={(e) => {
              setLinkTarget(e.target.value);
              commit({ linkTarget: e.target.value });
            }}
          >
            <option value="">— Seçin —</option>
            {options.products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {linkType === "collections_auto" ? (
        <p className="text-[11px] text-zinc-500 rounded border border-dashed p-2 bg-white">
          Hover menüde yayında olan tüm <strong>koleksiyonlar</strong> otomatik listelenir.
        </p>
      ) : null}

      {linkType === "url" ? (
        <label className="block text-xs">
          Özel URL
          <input
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            value={customHref}
            onChange={(e) => setCustomHref(e.target.value)}
            onBlur={() => commit({ href: customHref })}
            placeholder="/ veya https://…"
          />
        </label>
      ) : null}
    </div>
  );
}
