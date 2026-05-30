"use client";

import type { ProductMediaItem } from "@/lib/product-media";
import { ProductMediaEditor } from "@/components/admin/ProductMediaEditor";

/** @deprecated ProductMediaEditor kullanın */
export function ProductImagesEditor({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const items: ProductMediaItem[] = urls.map((url) => ({ url, mediaType: "image" }));
  return (
    <ProductMediaEditor
      items={items}
      onChange={(next) => onChange(next.map((m) => m.url))}
    />
  );
}
