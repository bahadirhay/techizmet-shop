"use client";

import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { AdminField, inputClass } from "@/components/admin/AdminForm";
import { PRODUCT_HIGHLIGHT_SLOTS, type ProductHighlight } from "@/lib/product-highlights";

export function ProductHighlightsEditor({
  highlights,
  onChange,
}: {
  highlights: ProductHighlight[];
  onChange: (highlights: ProductHighlight[]) => void;
}) {
  function updateSlot(index: number, patch: Partial<ProductHighlight>) {
    const next = [...highlights];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-zinc-800">Ürün ikon şeridi</p>
        <p className="mt-1 text-xs text-zinc-500">
          Sepete ekle butonunun altındaki 3 ikon alanı (ör. Derin Arındırma, Akıllı Formül, Besleyici).
          İkon boş bırakılırsa temadaki varsayılan görsel kalır.
        </p>
      </div>

      {Array.from({ length: PRODUCT_HIGHLIGHT_SLOTS }, (_, index) => (
        <div key={index} className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
          <p className="text-sm font-medium text-zinc-700">İkon {index + 1}</p>
          <AdminField label={`Etiket ${index + 1}`}>
            <input
              className={inputClass}
              value={highlights[index]?.label ?? ""}
              onChange={(e) => updateSlot(index, { label: e.target.value })}
              placeholder="Örn. Derin Arındırma"
            />
          </AdminField>
          <ImageUploadField
            label={`İkon ${index + 1}`}
            hint="SVG veya PNG — sürükle-bırak, dosyadan seç veya URL yapıştır. Boş bırakılırsa tema varsayılanı kullanılır."
            value={highlights[index]?.iconUrl ?? ""}
            onChange={(url) => updateSlot(index, { iconUrl: url })}
            maxEdgePx={512}
          />
        </div>
      ))}
    </div>
  );
}
