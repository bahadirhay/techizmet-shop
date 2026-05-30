"use client";

import type { CollectionGridColumns } from "@/lib/mirror-collection-list-grid";
import type { ProductGridColumns } from "@/lib/mirror-product-grid";

type GridValue = CollectionGridColumns | ProductGridColumns;

export function mergeCollectionGridColumns(
  defaults: CollectionGridColumns | undefined,
  saved: CollectionGridColumns | undefined,
): CollectionGridColumns {
  return saved ?? defaults ?? 3;
}

export function mergeProductGridColumns(
  defaults: ProductGridColumns | undefined,
  saved: ProductGridColumns | undefined,
): ProductGridColumns {
  return saved ?? defaults ?? 5;
}

export function MirrorCollectionGridFields({
  value,
  onChange,
  min = 3,
  max = 5,
  title = "Kart düzeni",
  description = "Masaüstünde vitrinde kaç kart yan yana görüneceğini seçin. Mobil görünüm temanın kendi düzenini kullanır.",
}: {
  value: GridValue;
  onChange: (columns: GridValue) => void;
  min?: number;
  max?: number;
  title?: string;
  description?: string;
}) {
  const options: GridValue[] = [];
  for (let n = min; n <= max; n++) options.push(n as GridValue);

  const cols = max <= 5 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className="mt-4 space-y-3 border-t border-zinc-700 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-violet-400">{title}</p>
      <p className="text-xs text-zinc-500">{description}</p>
      <div className={`grid ${cols} gap-2`}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`rounded-lg border px-2 py-2.5 text-center text-sm font-medium transition ${
              value === opt
                ? "border-violet-500 bg-violet-950/60 text-violet-100"
                : "border-zinc-600 text-zinc-400 hover:border-zinc-500"
            }`}
            onClick={() => onChange(opt)}
          >
            {opt} sütun
          </button>
        ))}
      </div>
    </div>
  );
}
