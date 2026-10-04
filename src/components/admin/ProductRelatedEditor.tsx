"use client";

import { AdminField, inputClass } from "@/components/admin/AdminForm";
import type { RelatedProductsSettings } from "@/lib/product-related";

type ProductOpt = { slug: string; title: string };

export function ProductRelatedEditor({
  value,
  onChange,
  productOptions,
  currentSlug,
}: {
  value: RelatedProductsSettings;
  onChange: (next: RelatedProductsSettings) => void;
  productOptions: ProductOpt[];
  currentSlug?: string;
}) {
  const options = productOptions.filter((p) => p.slug !== currentSlug);

  function toggleSlug(slug: string) {
    const set = new Set(value.productSlugs);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    onChange({ ...value, productSlugs: [...set] });
  }

  function moveSlug(slug: string, dir: -1 | 1) {
    const list = [...value.productSlugs];
    const i = list.indexOf(slug);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j]!, list[i]!];
    onChange({ ...value, productSlugs: list });
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
      <div>
        <p className="text-sm font-semibold text-zinc-800">Önerilen ürünler</p>
        <p className="text-xs text-zinc-500 mt-1">
          Ürün detay sayfasının altında 4&apos;lü grid. Otomatik modda diğer vitrin ürünleri listelenir;
          yeni ürün eklendikçe otomatik görünür.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Mod">
          <select
            className={inputClass}
            value={value.mode}
            onChange={(e) =>
              onChange({
                ...value,
                mode: e.target.value as RelatedProductsSettings["mode"],
              })
            }
          >
            <option value="auto">Otomatik (tüm diğer ürünler)</option>
            <option value="manual">Manuel seçim</option>
            <option value="off">Kapalı</option>
          </select>
        </AdminField>
        <AdminField label="Sütun sayısı">
          <select
            className={inputClass}
            value={value.columns}
            onChange={(e) =>
              onChange({
                ...value,
                columns: Number(e.target.value) as 2 | 3 | 4,
              })
            }
            disabled={value.mode === "off"}
          >
            <option value={4}>4 (önerilen)</option>
            <option value={3}>3</option>
            <option value={2}>2</option>
          </select>
        </AdminField>
        <AdminField label="Maks. adet (boş = hepsi)">
          <input
            type="number"
            min={1}
            max={48}
            className={inputClass}
            value={value.count ?? ""}
            placeholder="Hepsi"
            disabled={value.mode === "off"}
            onChange={(e) => {
              const raw = e.target.value.trim();
              onChange({
                ...value,
                count: raw ? Math.max(1, Math.min(48, Number(raw) || 1)) : null,
              });
            }}
          />
        </AdminField>
      </div>

      {value.mode === "manual" ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-700">Ürün seç (sıra = görünüm sırası)</p>
          {value.productSlugs.length > 0 ? (
            <ul className="space-y-1 rounded border border-zinc-200 bg-white p-2">
              {value.productSlugs.map((slug) => {
                const title = options.find((o) => o.slug === slug)?.title ?? slug;
                return (
                  <li key={slug} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{title}</span>
                    <button
                      type="button"
                      className="rounded border px-1.5 text-xs"
                      onClick={() => moveSlug(slug, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rounded border px-1.5 text-xs"
                      onClick={() => moveSlug(slug, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="rounded border px-1.5 text-xs text-red-600"
                      onClick={() => toggleSlug(slug)}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500">Henüz seçim yok.</p>
          )}
          <div className="max-h-48 overflow-y-auto rounded border border-zinc-200 bg-white p-2 space-y-1">
            {options.map((p) => (
              <label key={p.slug} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={value.productSlugs.includes(p.slug)}
                  onChange={() => toggleSlug(p.slug)}
                />
                <span className="truncate">{p.title}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
