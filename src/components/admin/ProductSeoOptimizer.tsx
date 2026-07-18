"use client";

import { useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";
import type { ProductHighlight } from "@/lib/product-highlights";
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
  weightGrams?: number;
  pieceCount?: number;
  onApply: (patch: {
    title?: string;
    slug?: string;
    seoTitle?: string;
    seoDescription?: string;
    description?: string;
    descriptionHtml?: string;
    keyFeaturesHtml?: string;
    howToUseHtml?: string;
    highlights?: ProductHighlight[];
  }) => void;
};

export function ProductSeoOptimizer(props: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ProductSeoOptimizeResult | null>(null);

  function applySuggestions(next: ProductSeoOptimizeResult, options?: { title?: boolean }) {
    props.onApply({
      ...(options?.title !== false ? { title: next.suggestedTitle } : {}),
      slug: next.suggestedSlug,
      seoTitle: next.seoTitle,
      seoDescription: next.seoDescription,
      description: next.suggestedDescription,
      descriptionHtml: next.suggestedDescriptionHtml,
      keyFeaturesHtml: next.suggestedKeyFeaturesHtml,
      howToUseHtml: next.suggestedHowToUseHtml,
      highlights: next.suggestedHighlights,
    });
    setErr(null);
  }

  async function runSeo(applyTitle = true) {
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
        weightGrams: props.weightGrams ?? undefined,
        pieceCount: props.pieceCount ?? undefined,
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
    if (next) applySuggestions(next, { title: applyTitle });
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-violet-950">SEO çalışması (tam paket)</p>
          <p className="mt-1 text-xs text-violet-900/80">
            Profesyonel ürün açıklaması (web + Trendyol/HB), meta, besin değerleri ve kullanım. Açıklamada zorunlu:{" "}
            <strong>köpek ödül maması</strong>, <strong>ödül maması</strong>,{" "}
            <strong>doğal köpek ödül maması</strong>. AI:{" "}
            <a href="/admin/settings/seo-ai" className="text-[var(--kn-brand)] underline">
              Ayarlar → SEO AI
            </a>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondary}
            disabled={busy}
            onClick={() => void runSeo(false)}
          >
            {busy ? "…" : "Sadece içerik + meta"}
          </button>
          <button type="button" className={btnPrimary} disabled={busy} onClick={() => void runSeo(true)}>
            {busy ? "Analiz ediliyor…" : "Tam SEO çalışması"}
          </button>
        </div>
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      {result ? (
        <div className="mt-4 space-y-4 rounded-lg border border-violet-100 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-900">
              Skor: {result.score}/100
            </span>
            <span className="text-xs text-green-700">Forma uygulandı</span>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <AdminField label="SEO başlık (Google)">
              <input className={inputClass} readOnly value={result.seoTitle} />
              <p className="mt-1 text-xs text-zinc-500">{result.seoTitle.length} karakter</p>
            </AdminField>
            <AdminField label="SEO açıklama">
              <textarea className={inputClass} rows={2} readOnly value={result.seoDescription} />
              <p className="mt-1 text-xs text-zinc-500">{result.seoDescription.length} karakter</p>
            </AdminField>
            <AdminField label="Pazaryeri ürün adı">
              <input className={inputClass} readOnly value={result.suggestedTitle} />
            </AdminField>
            <AdminField label="Slug">
              <input className={inputClass} readOnly value={result.suggestedSlug} />
            </AdminField>
          </div>

          {result.marketplaceTitles && MARKETPLACE_PLATFORMS.some((p) => result.marketplaceTitles?.[p.id]) ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-700">Pazaryeri başlıkları</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {MARKETPLACE_PLATFORMS.map((p) => {
                  const t = result.marketplaceTitles?.[p.id];
                  if (!t) return null;
                  return (
                    <div key={p.id} className="rounded border border-zinc-100 bg-zinc-50 px-2 py-1.5 text-xs">
                      <span className="font-medium text-zinc-700">{p.label}</span>
                      <p className="mt-0.5 text-zinc-600">{t}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {result.suggestedDescription ? (
            <AdminField label="Ürün tanıtımı (Description)">
              <textarea className={inputClass} rows={3} readOnly value={result.suggestedDescription} />
            </AdminField>
          ) : null}

          {result.suggestedHighlights?.some((h) => h.label) ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-700">İkon şeridi</p>
              <ul className="text-xs text-zinc-600">
                {result.suggestedHighlights.map((h, i) =>
                  h.label ? (
                    <li key={i}>
                      {i + 1}. {h.label}
                    </li>
                  ) : null,
                )}
              </ul>
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

          <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
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
      ) : (
        <p className="mt-3 text-xs text-violet-900">
          «Tam SEO çalışması» ürün adını pazaryeri formatına da uyarlar. Mevcut adınızı korumak için «Sadece
          içerik + meta» kullanın.
        </p>
      )}
    </div>
  );
}
