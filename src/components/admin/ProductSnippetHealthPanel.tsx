"use client";

import Link from "next/link";
import { useState } from "react";
import { btnSecondary } from "@/components/admin/AdminForm";
import type { ProductSnippetHealthResult } from "@/lib/admin/product-snippets/health";

export function ProductSnippetHealthPanel() {
  const [result, setResult] = useState<ProductSnippetHealthResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function runCheck() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/product-snippets/health");
    const j = (await res.json()) as ProductSnippetHealthResult & { error?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "Kontrol başarısız");
      return;
    }
    setResult(j);
    if (j.summary.nestedProductOnCollections > 0) {
      setMsg(
        `Kritik: koleksiyon sayfalarında ${j.summary.nestedProductOnCollections} Product şeması hâlâ var.`,
      );
    } else {
      setMsg(
        "Koleksiyon sayfaları temiz. GSC’deki aggregateRating uyarısı birkaç gün içinde düşmeli.",
      );
    }
  }

  return (
    <section className="admin-card admin-card-pad space-y-4">
      <h2 className="text-lg font-semibold">Ürün snippet’leri (aggregateRating)</h2>
      <p className="text-sm text-zinc-600">
        Search Console’daki <strong>“aggregateRating alanı eksik”</strong> uyarısı çoğunlukla
        koleksiyon sayfalarındaki iç içe Product şemasından gelir. Google ürün yıldızlarını yalnızca
        tek ürün (PDP) sayfalarında bekler. Bu kontrol koleksiyon JSON-LD’sini ve yorum kapsamasını
        tarar.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnSecondary} disabled={busy} onClick={() => void runCheck()}>
          {busy ? "Kontrol ediliyor…" : "Snippet sağlığını kontrol et"}
        </button>
        <Link href="/admin/reviews" className="text-sm font-medium text-[var(--kn-brand)] underline self-center">
          Yorumlar paneline git
        </Link>
      </div>
      {msg ? <p className="text-sm text-zinc-700">{msg}</p> : null}

      {result ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-xs uppercase text-zinc-500">Koleksiyon URL</p>
              <p className="text-xl font-semibold">{result.summary.collectionUrlsChecked}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-xs uppercase text-zinc-500">İç içe Product</p>
              <p
                className={`text-xl font-semibold ${
                  result.summary.nestedProductOnCollections ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {result.summary.nestedProductOnCollections}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-xs uppercase text-zinc-500">Yorumlu ürün</p>
              <p className="text-xl font-semibold text-emerald-700">
                {result.summary.productsWithReviews}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-xs uppercase text-zinc-500">Yorumsuz ürün</p>
              <p
                className={`text-xl font-semibold ${
                  result.summary.productsWithoutReviews ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {result.summary.productsWithoutReviews}
              </p>
            </div>
          </div>

          <ul className="space-y-2">
            {result.findings.map((f) => (
              <li
                key={f.code + (f.path ?? "")}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  f.severity === "fail"
                    ? "border-red-200 bg-red-50 text-red-900"
                    : f.severity === "warn"
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : "border-emerald-200 bg-emerald-50 text-emerald-950"
                }`}
              >
                <p className="font-medium">{f.title}</p>
                <p className="mt-0.5 opacity-90">{f.detail}</p>
                {f.path ? (
                  <p className="mt-1 font-mono text-xs">
                    <a href={f.path} className="underline" target="_blank" rel="noreferrer">
                      {f.path}
                    </a>
                  </p>
                ) : null}
                {f.fixHint ? <p className="mt-1 text-xs opacity-80">→ {f.fixHint}</p> : null}
              </li>
            ))}
          </ul>

          {result.productsMissingReviews.length ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Yorumu olmayan ürünler (PDP yıldızı için)</h3>
              <div className="max-h-56 overflow-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Ürün</th>
                      <th className="px-3 py-2">Slug</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.productsMissingReviews.map((p) => (
                      <tr key={p.id} className="border-t border-zinc-100">
                        <td className="px-3 py-2">{p.title}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          <a href={p.path} className="underline" target="_blank" rel="noreferrer">
                            {p.slug}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-950">
            <p className="font-semibold">Search Console doğrulama adımları</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              {result.gscSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  );
}
