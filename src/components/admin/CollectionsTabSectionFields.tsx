"use client";
import type { AdminProductOption } from "@/lib/admin-product-options";
import type {
  CollectionsTabItemEdit,
  CollectionsTabProductEdit,
} from "@/lib/mirror-collections-tab";

export function CollectionsTabSectionFields({
  tabs,
  productOptions,
  onChange,
}: {
  tabs: CollectionsTabItemEdit[];
  productOptions: AdminProductOption[];
  onChange: (tabs: CollectionsTabItemEdit[]) => void;
}) {
  function patchTab(tabIndex: number, patch: Partial<CollectionsTabItemEdit>) {
    onChange(tabs.map((t, i) => (i === tabIndex ? { ...t, ...patch } : t)));
  }

  function patchProduct(
    tabIndex: number,
    productIndex: number,
    patch: Partial<CollectionsTabProductEdit>,
  ) {
    const tab = tabs[tabIndex];
    if (!tab) return;
    const products = tab.products.map((p, i) =>
      i === productIndex ? { ...p, ...patch } : p,
    );
    patchTab(tabIndex, { products });
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-sky-500/30 bg-sky-950/40 px-3 py-2 text-xs text-sky-100">
        Türkçe vitrinde <strong>Türkçe</strong>, İngilizce seçiliyken <strong>İngilizce</strong> metinler
        gösterilir. Her iki dili de ayrı ayrı doldurun.
      </p>
      {tabs.map((tab, ti) => (
        <details
          key={tab.tabId}
          className="rounded-lg border border-zinc-700 bg-zinc-950/60"
          open={ti === 0}
        >
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-100">
            Sekme {ti + 1}: {tab.labelTr || tab.labelEn}
          </summary>
          <div className="space-y-3 border-t border-zinc-800 px-3 py-3">
            <label className="block text-xs text-zinc-400">
              Sekme adı (Türkçe) — örn. İPEKİ
              <input
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                value={tab.labelTr}
                onChange={(e) => patchTab(ti, { labelTr: e.target.value, label: e.target.value })}
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Sekme adı (İngilizce) — örn. SILKEN
              <input
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                value={tab.labelEn}
                onChange={(e) => patchTab(ti, { labelEn: e.target.value })}
              />
            </label>
            {tab.products.map((p, pi) => (
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
                      patchProduct(ti, pi, {
                        href: `/products/${product.slug}`,
                        titleTr: product.title,
                        titleEn: product.title,
                        title: product.title,
                        imageUrl: product.imageUrl ?? undefined,
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
                    className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                    value={p.titleTr}
                    onChange={(e) =>
                      patchProduct(ti, pi, { titleTr: e.target.value, title: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Başlık (İngilizce)
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                    value={p.titleEn}
                    onChange={(e) => patchProduct(ti, pi, { titleEn: e.target.value })}
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  Ürün linki
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                    value={p.href}
                    placeholder="/products/..."
                    onChange={(e) => patchProduct(ti, pi, { href: e.target.value })}
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
