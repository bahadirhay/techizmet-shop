"use client";

import type { AdminProductOption } from "@/lib/admin-product-options";
import type {
  CollectionsTabItemEdit,
  CollectionsTabProductEdit,
} from "@/lib/mirror-collections-tab";

function productFromOption(product: AdminProductOption): Partial<CollectionsTabProductEdit> {
  return {
    key: product.slug,
    href: `/products/${product.slug}`,
    titleTr: product.title,
    titleEn: product.title,
    title: product.title,
    imageUrl: product.imageUrl ?? undefined,
    priceText: product.priceLabel,
    hidden: false,
  };
}

export function CollectionsTabSectionFields({
  tabs,
  productOptions,
  onChange,
}: {
  tabs: CollectionsTabItemEdit[];
  productOptions: AdminProductOption[];
  onChange: (tabs: CollectionsTabItemEdit[]) => void;
}) {
  const visibleTabCount = tabs.filter((t) => !t.hidden).length;

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
        Ürün kartları mağazadan seçilir; <strong>başlık, görsel ve fiyat otomatik</strong> gelir.
        Sekme seçimi: örn. yalnızca <strong>DOĞAL</strong> veya <strong>DOĞAL + PETAL</strong>.
        Şu an vitrinde <strong>{visibleTabCount}</strong> / {tabs.length} sekme açık.
      </p>

      {tabs.map((tab, ti) => {
        const shownProducts = tab.products.filter((p) => !p.hidden).length;
        const maxShown =
          tab.visibleProductCount != null && tab.visibleProductCount > 0
            ? Math.min(tab.visibleProductCount, tab.products.length)
            : tab.products.length;

        return (
          <details
            key={tab.tabId}
            className={`rounded-lg border bg-zinc-950/60 ${
              tab.hidden ? "border-zinc-800 opacity-75" : "border-zinc-700"
            }`}
            open={ti === 0}
          >
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-100">
              <input
                type="checkbox"
                className="rounded border-zinc-600"
                checked={!tab.hidden}
                aria-label={`${tab.labelTr || tab.labelEn} sekmesini göster`}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => patchTab(ti, { hidden: !e.target.checked })}
              />
              <span className={tab.hidden ? "text-zinc-500 line-through" : ""}>
                {tab.labelTr || tab.labelEn || `Sekme ${ti + 1}`}
              </span>
              {!tab.hidden ? (
                <span className="ml-auto text-[11px] font-normal text-zinc-500">
                  {maxShown}/{tab.products.length} ürün
                </span>
              ) : null}
            </summary>

            <div className="space-y-3 border-t border-zinc-800 px-3 py-3">
              <label className="block text-xs text-zinc-400">
                Sekme adı (Türkçe) — örn. DOĞAL
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  value={tab.labelTr}
                  onChange={(e) => patchTab(ti, { labelTr: e.target.value, label: e.target.value })}
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Sekme adı (İngilizce) — örn. NATURAL
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  value={tab.labelEn}
                  onChange={(e) => patchTab(ti, { labelEn: e.target.value })}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs text-zinc-400">
                  Görünen ürün sayısı
                  <span className="mt-0.5 block font-normal text-zinc-500">
                    Boş bırakın = tüm seçili ürünler ({shownProducts} aktif)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={tab.products.length}
                    placeholder={`1–${tab.products.length}`}
                    className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    value={tab.visibleProductCount ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      if (!raw) {
                        patchTab(ti, { visibleProductCount: undefined });
                        return;
                      }
                      const n = parseInt(raw, 10);
                      patchTab(ti, {
                        visibleProductCount:
                          Number.isFinite(n) && n >= 1 && n <= tab.products.length ? n : undefined,
                      });
                    }}
                  />
                </label>

                <label className="flex items-start gap-2 pt-5 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-zinc-600"
                    checked={tab.showPricing !== false}
                    onChange={(e) => patchTab(ti, { showPricing: e.target.checked })}
                  />
                  <span>
                    Fiyat / sepet ikonu göster
                    <span className="mt-0.5 block font-normal text-zinc-500">
                      Kapalıyken ürün kartında yalnızca görsel ve başlık kalır
                    </span>
                  </span>
                </label>
              </div>

              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Ürün kartları</p>

              {tab.products.map((p, pi) => {
                const slug = p.href.match(/\/products\/([^/?#]+)/)?.[1] ?? "";
                const selected = productOptions.find((o) => o.slug === slug);

                return (
                  <div
                    key={p.key}
                    className={`rounded border p-2 space-y-2 ${
                      p.hidden ? "border-zinc-800/80 bg-zinc-950/40 opacity-70" : "border-zinc-800"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs text-zinc-300">
                        <input
                          type="checkbox"
                          className="rounded border-zinc-600"
                          checked={!p.hidden}
                          onChange={(e) => patchProduct(ti, pi, { hidden: !e.target.checked })}
                        />
                        Ürün {pi + 1} — vitrinde göster
                      </label>
                      {selected ? (
                        <span className="text-xs font-medium text-emerald-300/90">
                          {selected.priceLabel}
                        </span>
                      ) : null}
                    </div>
                    <label className="block text-xs text-zinc-400">
                      Mağazadan ürün seç
                      <select
                        className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm"
                        value={slug}
                        onChange={(e) => {
                          const product = productOptions.find((option) => option.slug === e.target.value);
                          if (!product) return;
                          patchProduct(ti, pi, productFromOption(product));
                        }}
                      >
                        <option value="">— Ürün seç —</option>
                        {productOptions.map((product) => (
                          <option key={product.slug} value={product.slug}>
                            {product.title} — {product.priceLabel}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selected ? (
                      <p className="rounded-md bg-zinc-900/80 px-2 py-1.5 text-xs text-zinc-400">
                        <strong className="text-zinc-200">{selected.title}</strong>
                        <span className="mx-1.5 text-zinc-600">·</span>
                        {selected.priceLabel}
                        <span className="mt-0.5 block text-[11px] text-zinc-500">
                          Başlık ve fiyat mağaza ürününden otomatik gelir; fiyat değişince Kaydet ile
                          güncellenir.
                        </span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-200/80">Listeden bir ürün seçin.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
