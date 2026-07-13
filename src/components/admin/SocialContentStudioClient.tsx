"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { ProductSocialContentPanel } from "@/components/admin/ProductSocialContentPanel";
import type { SocialContentDraftDTO } from "@/lib/admin/social-content/types";
import { platformLabel } from "@/lib/admin/social-content/types";

type ProductRow = { id: string; title: string; slug: string };

type PerformanceSummary = {
  hints: {
    available: boolean;
    topHooks: string[];
    strongAngles: string[];
    preferredMoods: string[];
    avgReach: number | null;
    sampleSize: number;
    insightNote: string;
  };
  topPosts: Array<{
    draftId: string;
    productTitle: string;
    reach: number | null;
    likes: number | null;
    saved: number | null;
    score: number;
    publishedAt: string | null;
  }>;
};

export function SocialContentStudioClient({
  products,
  initialDrafts,
  preselectedProductId,
}: {
  products: ProductRow[];
  initialDrafts: SocialContentDraftDTO[];
  preselectedProductId?: string;
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [focusProductId, setFocusProductId] = useState(preselectedProductId ?? "");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [performance, setPerformance] = useState<PerformanceSummary | null>(null);
  const [perfLoading, setPerfLoading] = useState(true);

  const filtered = products.filter((p) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const refreshDrafts = useCallback(async () => {
    const res = await fetch("/api/admin/social-content");
    const j = (await res.json()) as { drafts?: SocialContentDraftDTO[] };
    setDrafts(j.drafts ?? []);
  }, []);

  useEffect(() => {
    if (preselectedProductId) setFocusProductId(preselectedProductId);
  }, [preselectedProductId]);

  const loadPerformance = useCallback(async () => {
    setPerfLoading(true);
    try {
      const res = await fetch("/api/admin/social-content/performance");
      const j = (await res.json()) as PerformanceSummary;
      setPerformance(j);
    } finally {
      setPerfLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  async function bulkGenerate() {
    const ids = [...selected];
    if (!ids.length) {
      setMsg("Önce ürün seçin");
      return;
    }
    setBulkBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/social-content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids }),
      });
      const j = (await res.json()) as { created?: number; failed?: number; error?: string };
      if (!res.ok) {
        setMsg(j.error ?? "Toplu üretim başarısız");
        return;
      }
      setMsg(`${j.created ?? 0} ürün için görsel + metin üretildi${j.failed ? `, ${j.failed} hata` : ""}`);
      setSelected(new Set());
      await refreshDrafts();
    } finally {
      setBulkBusy(false);
    }
  }

  const focusProduct = products.find((p) => p.id === focusProductId);

  return (
    <div className="space-y-6">
      <section className="admin-card admin-card-pad">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">Öğrenme döngüsü (Instagram)</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Yayınlanan gönderilerin erişim ve kaydetme metrikleri sonraki AI brif ve metinlerine
              yansır. Marka katmanı ayarları:{" "}
              <Link href="/admin/integrations/social" className="underline">
                Sosyal yayın API
              </Link>
            </p>
          </div>
          <button type="button" className={btnSecondary} onClick={() => void loadPerformance()}>
            Yenile
          </button>
        </div>
        {perfLoading ? (
          <p className="mt-3 text-sm text-zinc-500">Metrikler yükleniyor…</p>
        ) : performance ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-zinc-50/80 p-3 text-sm">
              <p className="font-medium text-zinc-800">Brif ipuçları</p>
              <p className="mt-1 text-xs text-zinc-600">{performance.hints.insightNote}</p>
              {performance.hints.topHooks.length ? (
                <ul className="mt-2 list-disc pl-4 text-xs text-zinc-700">
                  {performance.hints.topHooks.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              ) : null}
              {performance.hints.avgReach ? (
                <p className="mt-2 text-xs text-zinc-600">
                  Ort. erişim: {performance.hints.avgReach.toLocaleString("tr-TR")} · örnek:{" "}
                  {performance.hints.sampleSize}
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border bg-zinc-50/80 p-3 text-sm">
              <p className="font-medium text-zinc-800">En iyi gönderiler</p>
              {performance.topPosts.length === 0 ? (
                <p className="mt-1 text-xs text-zinc-500">Henüz ölçülen yayın yok</p>
              ) : (
                <ul className="mt-2 space-y-2 text-xs">
                  {performance.topPosts.map((p) => (
                    <li key={p.draftId} className="flex justify-between gap-2 border-b border-zinc-200 pb-1">
                      <span className="truncate">{p.productTitle}</span>
                      <span className="shrink-0 text-zinc-500">
                        {p.reach != null ? `${p.reach} erişim` : "—"}
                        {p.saved != null ? ` · ${p.saved} kayıt` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <section className="admin-card admin-card-pad">
        <h2 className="font-semibold">Toplu üretim</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Ürünleri seçin; her biri için AI brif (geçmiş performansa göre), markalı görseller (1:1 +
          9:16) ve 4 platform metni üretilir. Toplu üretim görsel başına ~30–60 sn sürebilir.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className={`${inputClass} max-w-xs`}
            placeholder="Ürün ara…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button type="button" className={btnPrimary} disabled={bulkBusy} onClick={() => void bulkGenerate()}>
            {bulkBusy ? "Üretiliyor…" : `Seçilenleri üret (${selected.size})`}
          </button>
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setSelected(new Set(filtered.map((p) => p.id)))}
          >
            Listeyi seç
          </button>
          <button type="button" className={btnSecondary} onClick={() => setSelected(new Set())}>
            Seçimi temizle
          </button>
        </div>
        {msg ? <p className="mt-2 text-sm text-emerald-700">{msg}</p> : null}
        <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto text-sm">
          {filtered.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-zinc-50">
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                <span className="flex-1">{p.title}</span>
                <button
                  type="button"
                  className="text-xs text-[var(--kn-brand)] underline"
                  onClick={(e) => {
                    e.preventDefault();
                    setFocusProductId(p.id);
                  }}
                >
                  Düzenle
                </button>
                <Link href={`/admin/products/${p.id}/edit`} className="text-xs text-zinc-500 underline">
                  Ürün
                </Link>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {focusProduct ? (
        <ProductSocialContentPanel
          productId={focusProduct.id}
          productTitle={focusProduct.title}
          compact
        />
      ) : (
        <section className="admin-card admin-card-pad">
          <h2 className="font-semibold">Son taslaklar</h2>
          {drafts.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Henüz sosyal içerik taslağı yok.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-zinc-500">
                  <th className="pb-2">Ürün</th>
                  <th className="pb-2">Platform</th>
                  <th className="pb-2">Güncelleme</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {drafts.slice(0, 40).map((d) => (
                  <tr key={d.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-2">{d.productTitle}</td>
                    <td className="py-2 pr-2">{platformLabel(d.platform)}</td>
                    <td className="py-2 pr-2 text-zinc-500">
                      {new Date(d.updatedAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="text-[var(--kn-brand)] underline"
                        onClick={() => setFocusProductId(d.productId)}
                      >
                        Aç
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
