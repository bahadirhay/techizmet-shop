"use client";

import { useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import type { ProductSeoInsight, ProductSeoOptimizeResult } from "@/lib/admin/product-seo/types";

const SOURCE_LABELS: Record<ProductSeoInsight["source"], string> = {
  google: "Google",
  site: "Site",
  marketplace: "Pazaryeri",
  analysis: "Analiz",
  ai: "AI",
};

type Props = {
  title: string;
  slug: string;
  description: string;
  categoryIds: string[];
  categoryId: string;
  brandId: string;
  productId?: string;
  onApply: (patch: {
    title?: string;
    slug?: string;
    seoTitle?: string;
    seoDescription?: string;
    description?: string;
    descriptionHtml?: string;
    keyFeaturesHtml?: string;
  }) => void;
};

export function ProductSeoOptimizer(props: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ProductSeoOptimizeResult | null>(null);

  function applySuggestions(next: ProductSeoOptimizeResult) {
    props.onApply({
      title: next.suggestedTitle,
      slug: next.suggestedSlug,
      seoTitle: next.seoTitle,
      seoDescription: next.seoDescription,
      description: next.suggestedDescription,
      descriptionHtml: next.suggestedDescriptionHtml,
      keyFeaturesHtml: next.suggestedKeyFeaturesHtml,
    });
    setErr(null);
  }

  async function runSeo() {
    if (!props.title.trim()) {
      setErr("Önce ürün adını girin");
      return;
    }
    setBusy(true);
    setErr(null);
    setResult(null);

    const res = await fetch("/api/admin/products/seo-optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: props.title,
        slug: props.slug,
        description: props.description,
        categoryIds: props.categoryIds,
        categoryId: props.categoryId,
        brandId: props.brandId || undefined,
        productId: props.productId,
      }),
    });

    const json = (await res.json()) as { error?: string; result?: ProductSeoOptimizeResult };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "SEO analizi başarısız");
      return;
    }
    const next = json.result ?? null;
    setResult(next);
    if (next) applySuggestions(next);
  }

  function applyAll() {
    if (!result) return;
    applySuggestions(result);
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-violet-950">SEO çalışması</p>
          <p className="mt-1 text-xs text-violet-900/80">
            Normal ürün adınızı yazın; analiz sonrası önerilen pazaryeri uyumlu ad, slug, SEO alanları ve
            açıklamalar forma otomatik uygulanır. AI anahtarları:{" "}
            <a href="/admin/settings/seo-ai" className="text-[var(--kn-brand)] underline">
              Ayarlar → SEO AI
            </a>
          </p>
        </div>
        <button type="button" className={btnSecondary} disabled={busy} onClick={() => void runSeo()}>
          {busy ? "Analiz ediliyor…" : "SEO çalışması yap"}
        </button>
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      {result ? (
        <div className="mt-4 space-y-4 rounded-lg border border-violet-100 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-900">
              Skor: {result.score}/100
            </span>
            <span className="text-xs text-green-700">Forma uygulandı</span>
            <button type="button" className={btnPrimary} onClick={applyAll}>
              Tekrar uygula
            </button>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <AdminField label="Önerilen ürün adı (pazaryeri uyumlu)">
              <input className={inputClass} readOnly value={result.suggestedTitle} />
            </AdminField>
            <AdminField label="Önerilen slug">
              <input className={inputClass} readOnly value={result.suggestedSlug} />
            </AdminField>
            <AdminField label="SEO başlık">
              <input className={inputClass} readOnly value={result.seoTitle} />
            </AdminField>
            <AdminField label="SEO açıklama">
              <textarea className={inputClass} rows={2} readOnly value={result.seoDescription} />
            </AdminField>
          </div>

          {result.suggestedDescription ? (
            <div className="grid gap-3 text-sm">
              <AdminField label="Önerilen kısa açıklama">
                <textarea className={inputClass} rows={2} readOnly value={result.suggestedDescription} />
              </AdminField>
              {result.suggestedKeyFeaturesHtml ? (
                <AdminField label="Önerilen Key Features">
                  <textarea className={inputClass} rows={4} readOnly value={result.suggestedKeyFeaturesHtml} />
                </AdminField>
              ) : null}
            </div>
          ) : null}

          {result.ai ? (
            <p className="text-xs text-zinc-600">
              <span className="font-medium">AI:</span> {result.ai.message}
            </p>
          ) : null}

          {result.keywords.length ? (
            <p className="text-xs text-zinc-600">
              <span className="font-medium">Anahtar kelimeler:</span> {result.keywords.slice(0, 8).join(", ")}
            </p>
          ) : null}

          <ul className="space-y-2 text-xs">
            {result.insights.map((ins, i) => (
              <li key={i} className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2">
                <span className="font-medium text-zinc-800">
                  [{SOURCE_LABELS[ins.source]}] {ins.label}
                </span>
                <span className="text-zinc-600"> — {ins.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
