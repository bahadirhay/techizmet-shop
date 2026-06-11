"use client";

import { MirrorImageField } from "@/components/admin/MirrorImageField";
import { MirrorTypographyFields } from "@/components/admin/MirrorTypographyFields";
import type { AdminProductOption } from "@/lib/admin-product-options";
import type { MirrorElementEdit } from "@/lib/mirror-element-edits";
import { resolveMirrorElementEdit } from "@/lib/mirror-element-edits";
import type { ScrollingCollectionItemEdit } from "@/lib/mirror-scrolling-collections-section";
import type { TestimonialItemEdit } from "@/lib/mirror-testimonial-section";
import type { TrendingProductItemEdit } from "@/lib/mirror-trending-products-section";

function BilingualPair({
  label,
  tr,
  en,
  onTr,
  onEn,
  rows = 2,
}: {
  label: string;
  tr: string;
  en: string;
  onTr: (v: string) => void;
  onEn: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-950/50 p-3">
      <p className="text-xs font-medium text-zinc-300">{label}</p>
      <label className="block text-xs text-zinc-500">
        Türkçe
        <textarea
          className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          rows={rows}
          value={tr}
          onChange={(e) => onTr(e.target.value)}
        />
      </label>
      <label className="block text-xs text-zinc-500">
        İngilizce
        <textarea
          className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          rows={rows}
          value={en}
          onChange={(e) => onEn(e.target.value)}
        />
      </label>
    </div>
  );
}

export function TestimonialSectionFields({
  items,
  visibleCount,
  sectionKey,
  elements,
  onPatchElement,
  onChange,
}: {
  items: TestimonialItemEdit[];
  visibleCount: number;
  sectionKey?: string;
  elements?: Record<string, MirrorElementEdit>;
  onPatchElement?: (edit: MirrorElementEdit) => void;
  onChange: (items: TestimonialItemEdit[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Her yorum kartı — isim, alıntı (TR/EN) ve profil görseli. İlk {visibleCount} kart vitrinde
        görünür.
      </p>
      {items.map((item, i) => (
        <div
          key={item.blockId}
          className={`space-y-2 rounded-lg border p-3 ${
            i < visibleCount ? "border-zinc-600" : "border-zinc-700/60 opacity-80"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-zinc-400">Yorum {i + 1}</p>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                i < visibleCount
                  ? "bg-emerald-950/80 text-emerald-300"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {i < visibleCount ? "Vitrinde" : "Gizli"}
            </span>
          </div>
          <BilingualPair
            label="Müşteri adı"
            tr={item.authorTr}
            en={item.authorEn}
            onTr={(authorTr) => {
              const next = [...items];
              next[i] = { ...item, authorTr };
              onChange(next);
            }}
            onEn={(authorEn) => {
              const next = [...items];
              next[i] = { ...item, authorEn };
              onChange(next);
            }}
            rows={1}
          />
          <BilingualPair
            label="Yorum metni"
            tr={item.quoteTr}
            en={item.quoteEn}
            onTr={(quoteTr) => {
              const next = [...items];
              next[i] = { ...item, quoteTr };
              onChange(next);
            }}
            onEn={(quoteEn) => {
              const next = [...items];
              next[i] = { ...item, quoteEn };
              onChange(next);
            }}
            rows={3}
          />
          <MirrorImageField
            editorChrome
            label="Profil görseli"
            hint="Yuvarlak avatar — önerilen 140×140 px veya daha büyük kare görsel."
            value={item.imageUrl ?? ""}
            onChange={(imageUrl) => {
              const next = [...items];
              next[i] = { ...item, imageUrl: imageUrl || undefined };
              onChange(next);
            }}
          />
          {sectionKey && onPatchElement ? (
            <>
              <MirrorTypographyFields
                compact
                value={resolveMirrorElementEdit(`${sectionKey}--author-title--${i}`, elements)?.style}
                onChange={(style) =>
                  onPatchElement({
                    id: `${sectionKey}--author-title--${i}`,
                    kind: "text",
                    style,
                  })
                }
              />
              <p className="text-[10px] text-zinc-600">↑ Müşteri adı görünümü</p>
              <MirrorTypographyFields
                compact
                value={resolveMirrorElementEdit(`${sectionKey}--testimonial--desc--${i}`, elements)?.style}
                onChange={(style) =>
                  onPatchElement({
                    id: `${sectionKey}--testimonial--desc--${i}`,
                    kind: "html",
                    style,
                  })
                }
              />
              <p className="text-[10px] text-zinc-600">↑ Yorum metni görünümü</p>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ScrollingCollectionsSectionFields({
  items,
  onChange,
}: {
  items: ScrollingCollectionItemEdit[];
  onChange: (items: ScrollingCollectionItemEdit[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">Kaydırılan koleksiyon kartları — başlık TR/EN, link ve görsel.</p>
      {items.map((item, i) => (
        <div key={item.cardId} className="space-y-2 rounded-lg border border-zinc-600 p-3">
          <p className="text-xs font-medium text-zinc-400">Kart {i + 1}</p>
          <BilingualPair
            label="Koleksiyon adı"
            tr={item.titleTr}
            en={item.titleEn}
            onTr={(titleTr) => {
              const next = [...items];
              next[i] = { ...item, titleTr };
              onChange(next);
            }}
            onEn={(titleEn) => {
              const next = [...items];
              next[i] = { ...item, titleEn };
              onChange(next);
            }}
            rows={1}
          />
          <label className="block text-xs text-zinc-500">
            Koleksiyon linki
            <input
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={item.href}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, href: e.target.value };
                onChange(next);
              }}
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Ürün sayısı (isteğe bağlı)
            <input
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={item.productCount ?? ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, productCount: e.target.value || undefined };
                onChange(next);
              }}
            />
          </label>
          <MirrorImageField
            label="Kart görseli"
            value={item.imageUrl ?? ""}
            onChange={(imageUrl) => {
              const next = [...items];
              next[i] = { ...item, imageUrl: imageUrl || undefined };
              onChange(next);
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function TrendingProductsSectionFields({
  items,
  productOptions,
  onChange,
}: {
  items: TrendingProductItemEdit[];
  productOptions: AdminProductOption[];
  onChange: (items: TrendingProductItemEdit[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">Trend sütunları — ürün adı, açıklama, fiyat metni ve link.</p>
      {items.map((item, i) => (
        <div key={item.columnId} className="space-y-2 rounded-lg border border-zinc-600 p-3">
          <p className="text-xs font-medium text-zinc-400">Sütun {i + 1}</p>
          <label className="block text-xs text-zinc-400">
            Ürün seç
            <select
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={item.href.match(/\/products\/([^/?#]+)/)?.[1] ?? ""}
              onChange={(e) => {
                const product = productOptions.find((option) => option.slug === e.target.value);
                if (!product) return;
                const next = [...items];
                next[i] = {
                  ...item,
                  href: `/products/${product.slug}`,
                  titleTr: product.title,
                  titleEn: product.title,
                  descTr: product.description ?? "",
                  descEn: product.description ?? "",
                  priceText: product.priceLabel,
                  imageUrl: product.imageUrl ?? undefined,
                };
                onChange(next);
              }}
            >
              <option value="">— Ürün seç —</option>
              {productOptions.map((product) => (
                <option key={product.slug} value={product.slug}>
                  {product.title} ({product.slug})
                </option>
              ))}
            </select>
          </label>
          <BilingualPair
            label="Ürün adı"
            tr={item.titleTr}
            en={item.titleEn}
            onTr={(titleTr) => {
              const next = [...items];
              next[i] = { ...item, titleTr };
              onChange(next);
            }}
            onEn={(titleEn) => {
              const next = [...items];
              next[i] = { ...item, titleEn };
              onChange(next);
            }}
            rows={1}
          />
          <BilingualPair
            label="Açıklama"
            tr={item.descTr}
            en={item.descEn}
            onTr={(descTr) => {
              const next = [...items];
              next[i] = { ...item, descTr };
              onChange(next);
            }}
            onEn={(descEn) => {
              const next = [...items];
              next[i] = { ...item, descEn };
              onChange(next);
            }}
            rows={2}
          />
          <label className="block text-xs text-zinc-500">
            Ürün linki
            <input
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={item.href}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, href: e.target.value };
                onChange(next);
              }}
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Fiyat metni
            <input
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={item.priceText ?? ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, priceText: e.target.value || undefined };
                onChange(next);
              }}
            />
          </label>
        </div>
      ))}
    </div>
  );
}
