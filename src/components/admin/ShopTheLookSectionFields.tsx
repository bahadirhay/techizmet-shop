"use client";

import { MirrorImageField } from "@/components/admin/MirrorImageField";
import type { AdminProductOption } from "@/lib/admin-product-options";
import type {
  ShopTheLookHotspotEdit,
  ShopTheLookSectionEdit,
} from "@/lib/mirror-shop-the-look";

export function ShopTheLookSectionFields({
  value,
  productOptions,
  onChange,
}: {
  value: ShopTheLookSectionEdit;
  productOptions: AdminProductOption[];
  onChange: (v: ShopTheLookSectionEdit) => void;
}) {
  function patchHotspot(index: number, patch: Partial<ShopTheLookHotspotEdit>) {
    const hotspots = value.hotspots.map((h, i) => (i === index ? { ...h, ...patch } : h));
    onChange({ ...value, hotspots });
  }

  function patchProduct(
    hi: number,
    pi: number,
    patch: Partial<ShopTheLookHotspotEdit["products"][number]>,
  ) {
    const hs = value.hotspots[hi];
    if (!hs) return;
    const products = hs.products.map((p, j) => (j === pi ? { ...p, ...patch } : p));
    patchHotspot(hi, { products });
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
        Yüz fotoğrafındaki noktalar: fare ile üzerine gelince küçük <strong>hover görseli</strong>, tıklayınca
        sağdan açılan <strong>çekmece</strong> ve ürün listesi. TR / EN metinleri ayrı kaydedilir.
      </p>
      <MirrorImageField
        label="Ana yüz görseli"
        value={value.mainImageUrl ?? ""}
        onChange={(url) => onChange({ ...value, mainImageUrl: url })}
      />
      {value.hotspots.map((hs, hi) => (
        <details
          key={hs.hotspotId}
          className="rounded-lg border border-zinc-700 bg-zinc-950/60"
          open={hi === 0}
        >
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-100">
            Hotspot {hi + 1} (nokta)
          </summary>
          <div className="space-y-2 border-t border-zinc-800 px-3 py-3">
            <label className="block text-xs text-zinc-400">
              Çekmece başlığı (Türkçe)
              <input
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                value={hs.drawerHeadingTr ?? hs.drawerHeading ?? ""}
                onChange={(e) =>
                  patchHotspot(hi, {
                    drawerHeadingTr: e.target.value,
                    drawerHeading: e.target.value,
                  })
                }
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Çekmece başlığı (İngilizce)
              <input
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                value={hs.drawerHeadingEn ?? ""}
                onChange={(e) => patchHotspot(hi, { drawerHeadingEn: e.target.value })}
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Çekmece açıklama (Türkçe)
              <textarea
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                rows={2}
                value={hs.drawerDescTr ?? hs.drawerDesc ?? ""}
                onChange={(e) =>
                  patchHotspot(hi, { drawerDescTr: e.target.value, drawerDesc: e.target.value })
                }
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Çekmece açıklama (İngilizce)
              <textarea
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                rows={2}
                value={hs.drawerDescEn ?? ""}
                onChange={(e) => patchHotspot(hi, { drawerDescEn: e.target.value })}
              />
            </label>
            {hs.products.map((p, pi) => (
              <div key={p.key} className="rounded border border-zinc-800 p-2 space-y-2">
                <p className="text-xs font-medium text-zinc-500">Ürün {pi + 1}</p>
                <label className="block text-xs text-zinc-400">
                  Ürün seç
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                    value={p.href.match(/\/products\/([^/?#]+)/)?.[1] ?? ""}
                    onChange={(e) => {
                      const product = productOptions.find((option) => option.slug === e.target.value);
                      if (!product) return;
                      patchProduct(hi, pi, {
                        href: `/products/${product.slug}`,
                        titleTr: product.title,
                        titleEn: product.title,
                        title: product.title,
                        imageUrl: product.imageUrl ?? undefined,
                        hoverImageUrl: product.imageUrl ?? undefined,
                      });
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
                <label className="block text-xs text-zinc-400">
                  Başlık (Türkçe)
                  <input
                    className="w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
                    value={p.titleTr}
                    onChange={(e) =>
                      patchProduct(hi, pi, { titleTr: e.target.value, title: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Başlık (İngilizce)
                  <input
                    className="w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
                    value={p.titleEn}
                    onChange={(e) => patchProduct(hi, pi, { titleEn: e.target.value })}
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Ürün linki
                  <input
                    className="w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-sm"
                    placeholder="/products/..."
                    value={p.href}
                    onChange={(e) => patchProduct(hi, pi, { href: e.target.value })}
                  />
                </label>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
