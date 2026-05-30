"use client";

import Link from "next/link";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { AdminField, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import type { ProductExploreLook } from "@/lib/product-explore-looks";
import { DEFAULT_EXPLORE_LABEL } from "@/lib/product-explore-looks";

type ProductOpt = { slug: string; title: string };

export function ProductExploreEditor({
  looks,
  useSiteDefault,
  onLooksChange,
  onUseSiteDefaultChange,
  productOptions,
  variant = "product",
}: {
  looks: ProductExploreLook[];
  useSiteDefault?: boolean;
  onLooksChange: (looks: ProductExploreLook[]) => void;
  onUseSiteDefaultChange?: (v: boolean) => void;
  productOptions: ProductOpt[];
  /** product = ürün formu; site = mağaza varsayılanı ayar sayfası */
  variant?: "product" | "site";
}) {
  const isSite = variant === "site";
  const useDefault = isSite ? false : (useSiteDefault ?? true);
  function updateCard(i: number, patch: Partial<ProductExploreLook>) {
    const next = looks.map((l, j) => (j === i ? { ...l, ...patch } : l));
    onLooksChange(next);
  }

  function addCard() {
    onLooksChange([
      ...looks,
      { imageUrl: "", label: DEFAULT_EXPLORE_LABEL, productSlugs: [] },
    ]);
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
      <div>
        <p className="text-sm font-semibold text-zinc-800">Sayfa altı — Keşfet (EXPLORE)</p>
        <p className="text-xs text-zinc-500 mt-1">
          {isSite
            ? "Tüm ürün detay sayfalarının altındaki 3 lifestyle görsel ve + ile açılan ürün listesi. Ürün formunda özel içerik tanımlanmamışsa bu varsayılan kullanılır."
            : "Vitrinde ürün açıklamasının altındaki 3 büyük görsel ve + ile açılan ürün kartları. Mağaza varsayılanını kullanabilir veya bu ürüne özel tanımlayabilirsiniz."}
        </p>
      </div>

      {!isSite ? (
        <label className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useDefault}
              onChange={(e) => onUseSiteDefaultChange?.(e.target.checked)}
            />
            Mağaza varsayılanını kullan
          </span>
          <Link
            href="/admin/settings/product-explore"
            className="text-[var(--kn-brand)] hover:underline text-xs"
          >
            Sayfalar → Ürün sayfası altı →
          </Link>
        </label>
      ) : null}

      {isSite || !useDefault ? (
        <>
          {looks.map((look, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-700">Kart {i + 1}</p>
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => onLooksChange(looks.filter((_, j) => j !== i))}
                >
                  Kartı kaldır
                </button>
              </div>

              <ImageUploadField
                label="Lifestyle görsel"
                value={look.imageUrl}
                onChange={(url) => updateCard(i, { imageUrl: url })}
              />

              <AdminField label="Buton metni">
                <input
                  className={inputClass}
                  value={look.label}
                  onChange={(e) => updateCard(i, { label: e.target.value })}
                  placeholder="EXPLORE"
                />
              </AdminField>

              <AdminField label="Popup ürünleri (sırayla)">
                <p className="text-xs text-zinc-500 mb-2">
                  + tıklanınca bu ürünler listelenir. Her satır bir ürün.
                </p>
                {look.productSlugs.map((slug, si) => (
                  <div key={si} className="mb-2 flex gap-2">
                    <select
                      className={inputClass}
                      value={slug}
                      onChange={(e) => {
                        const slugs = [...look.productSlugs];
                        slugs[si] = e.target.value;
                        updateCard(i, { productSlugs: slugs.filter(Boolean) });
                      }}
                    >
                      <option value="">— Ürün seç —</option>
                      {productOptions.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.title} ({p.slug})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="text-sm text-red-600 shrink-0"
                      onClick={() =>
                        updateCard(i, {
                          productSlugs: look.productSlugs.filter((_, j) => j !== si),
                        })
                      }
                    >
                      Sil
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() =>
                    updateCard(i, { productSlugs: [...look.productSlugs, ""] })
                  }
                >
                  + Ürün ekle
                </button>
              </AdminField>
            </div>
          ))}

          <button type="button" className={btnSecondary} onClick={addCard}>
            + Keşfet kartı ekle
          </button>
        </>
      ) : (
        <p className="text-sm text-zinc-600 rounded-md border border-dashed border-zinc-300 bg-white px-3 py-2">
          Bu ürün için{" "}
          <Link href="/admin/settings/product-explore" className="text-[var(--kn-brand)] hover:underline">
            Sayfalar → Ürün sayfası altı
          </Link>{" "}
          kullanılıyor. Ürüne özel blok için yukarıdaki kutuyu kapatın.
        </p>
      )}
    </div>
  );
}
