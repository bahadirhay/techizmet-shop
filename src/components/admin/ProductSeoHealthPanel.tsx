"use client";

import {
  evaluateProductSeoHealth,
  seoHealthScore,
  type ProductSeoHealthItem,
} from "@/lib/admin/product-seo/health";
import { btnSecondary } from "@/components/admin/AdminForm";

const STATUS_STYLES: Record<ProductSeoHealthItem["status"], string> = {
  ok: "text-green-800 bg-green-50 border-green-100",
  warn: "text-amber-900 bg-amber-50 border-amber-100",
  fail: "text-red-800 bg-red-50 border-red-100",
};

const STATUS_ICON: Record<ProductSeoHealthItem["status"], string> = {
  ok: "✓",
  warn: "!",
  fail: "✗",
};

export function ProductSeoHealthPanel({
  title,
  slug,
  seoTitle,
  seoDescription,
  description,
  descriptionHtml,
  keyFeaturesHtml,
  howToUseHtml,
  brandId,
  categoryId,
  imageUrl,
  barcode,
  published,
  homepageMode,
  siteUrl,
  onFillMeta,
}: {
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  description: string;
  descriptionHtml: string;
  keyFeaturesHtml: string;
  howToUseHtml: string;
  brandId: string;
  categoryId: string;
  imageUrl: string;
  barcode: string;
  published: boolean;
  homepageMode: "mirror" | "blocks";
  siteUrl?: string;
  onFillMeta?: () => void;
}) {
  const items = evaluateProductSeoHealth({
    title,
    slug,
    seoTitle,
    seoDescription,
    description,
    descriptionHtml,
    keyFeaturesHtml,
    howToUseHtml,
    brandId,
    categoryId,
    imageUrl,
    barcode,
    published,
    homepageMode,
    siteUrl,
  });
  const score = seoHealthScore(items);
  const preview = items.find((i) => i.id === "preview");
  const needsMeta = !seoTitle.trim() || !seoDescription.trim();

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">SEO sağlık kontrolü</p>
        <div className="flex items-center gap-2">
          {needsMeta && onFillMeta ? (
            <button type="button" className={btnSecondary} onClick={onFillMeta}>
              Meta alanlarını doldur
            </button>
          ) : null}
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200">
            {score}/100
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Google meta, tanıtım, besin değerleri, kullanım ve pazaryeri başlıkları için kontrol.
      </p>
      <ul className="mt-3 space-y-2">
        {items
          .filter((i) => i.id !== "preview")
          .map((item) => (
            <li
              key={item.id}
              className={`rounded-md border px-2.5 py-2 text-xs ${STATUS_STYLES[item.status]}`}
            >
              <span className="font-semibold">
                {STATUS_ICON[item.status]} {item.label}
              </span>
              <p className="mt-0.5 opacity-90">{item.detail}</p>
            </li>
          ))}
      </ul>
      {preview?.detail && published ? (
        <p className="mt-3 text-xs">
          <a
            href={preview.detail}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--kn-brand)] underline"
          >
            Canlı ürün sayfasını aç
          </a>
        </p>
      ) : null}
    </div>
  );
}
