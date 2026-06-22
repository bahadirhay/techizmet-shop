"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { ProductSocialContentPanel } from "@/components/admin/ProductSocialContentPanel";
import type { SocialContentDraftDTO } from "@/lib/admin/social-content/types";
import { platformLabel } from "@/lib/admin/social-content/types";

type ProductRow = { id: string; title: string; slug: string };

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
      setMsg(`${j.created ?? 0} ürün için içerik üretildi${j.failed ? `, ${j.failed} hata` : ""}`);
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
        <h2 className="font-semibold">Toplu üretim</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Ürünleri seçin; her biri için Instagram, TikTok, YouTube ve LinkedIn taslakları oluşturulur.
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
