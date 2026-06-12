"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminListRowActions } from "@/components/admin/AdminListRowActions";
import { MarketplacePlatformBadges } from "@/components/admin/MarketplacePlatformBadges";
import { btnSecondary } from "@/components/admin/AdminForm";
import { formatTry } from "@/lib/admin/money";
import { parseProductBadges, badgePreset, type ProductBadgeId } from "@/lib/product-badges";

export type ProductRow = {
  id: string;
  kind?: string;
  title: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  published: boolean;
  priceMinor: number;
  stockQty: number;
  lowStockThreshold: number;
  badgesJson: string | null;
  collectionTitle: string | null;
  categoryTitle: string | null;
  brandName: string | null;
  variantCount: number;
  marketplaces: { platform: string; status: string }[];
};

export function ProductsBulkTable({
  products,
  categories,
  brands,
}: {
  products: ProductRow[];
  categories: { id: string; title: string }[];
  brands: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkBrand, setBulkBrand] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.sku?.toLowerCase().includes(q) ?? false) ||
        (p.collectionTitle?.toLowerCase().includes(q) ?? false),
    );
  }, [products, query]);

  const allIds = useMemo(() => filtered.map((p) => p.id), [filtered]);
  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulk(action: Record<string, unknown>) {
    if (selected.size === 0) {
      setErr("Önce ürün seçin");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/products/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], ...action }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "İşlem başarısız");
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3">
        <input
          type="search"
          className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          placeholder="Ürün ara (ad, slug, SKU, koleksiyon)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="text-sm text-zinc-600">
          {filtered.length}/{products.length} ürün
          {selected.size > 0 ? ` · ${selected.size} seçili` : ""}
        </span>
        <button type="button" className={btnSecondary} onClick={() => bulk({ published: true })} disabled={busy}>
          Yayınla
        </button>
        <button type="button" className={btnSecondary} onClick={() => bulk({ published: false })} disabled={busy}>
          Taslağa al
        </button>
        <button type="button" className={btnSecondary} onClick={() => bulk({ stockDelta: 5 })} disabled={busy}>
          Stok +5
        </button>
        <button type="button" className={btnSecondary} onClick={() => bulk({ stockDelta: -1 })} disabled={busy}>
          Stok −1
        </button>
        <select
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          value={bulkCategory}
          onChange={(e) => setBulkCategory(e.target.value)}
        >
          <option value="">Kategori ata…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={btnSecondary}
          disabled={busy || !bulkCategory}
          onClick={() => bulk({ categoryId: bulkCategory })}
        >
          Uygula
        </button>
        <select
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          value={bulkBrand}
          onChange={(e) => setBulkBrand(e.target.value)}
        >
          <option value="">Marka ata…</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={btnSecondary}
          disabled={busy || !bulkBrand}
          onClick={() => bulk({ brandId: bulkBrand })}
        >
          Uygula
        </button>
        <button
          type="button"
          className={`${btnSecondary} text-red-600`}
          disabled={busy}
          onClick={() => {
            if (confirm(`${selected.size} ürünü silmek istediğinize emin misiniz?`)) {
              bulk({ delete: true });
            }
          }}
        >
          Sil
        </button>
        {err ? <span className="text-sm text-red-600">{err}</span> : null}
        <span className="text-xs text-zinc-400" title="Trendyol, Hepsiburada, Amazon vb.">
          Rozetler: TY · HB · AMZ · n11 · ÇS · PZR
        </span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Tümünü seç" />
              </th>
              <th>Ürün</th>
              <th>SKU / Barkod</th>
              <th>Kategori</th>
              <th>Marka</th>
              <th>Durum</th>
              <th>Pazaryerleri</th>
              <th>Etiketler</th>
              <th>Fiyat</th>
              <th>Varyant</th>
              <th>Stok</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    aria-label={`Seç ${p.title}`}
                  />
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl.startsWith("/") ? p.imageUrl : `/${p.imageUrl}`}
                        alt=""
                        className="h-10 w-10 rounded object-cover bg-zinc-100"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-zinc-100" />
                    )}
                    <div>
                      <span className="font-medium">{p.title}</span>
                      {p.kind === "bundle" ? (
                        <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">
                          Paket
                        </span>
                      ) : null}
                      {!p.published ? (
                        <span className="ml-2 text-xs text-amber-600">taslak</span>
                      ) : null}
                      <p className="text-xs text-zinc-400">{p.collectionTitle ?? "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="text-zinc-600">
                  {p.sku ?? "—"}
                  {p.barcode ? <span className="block text-xs text-zinc-400">{p.barcode}</span> : null}
                </td>
                <td>{p.categoryTitle ?? "—"}</td>
                <td>{p.brandName ?? "—"}</td>
                <td>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.published
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {p.published ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td>
                  <MarketplacePlatformBadges listings={p.marketplaces} />
                </td>
                <td>
                  <div className="flex max-w-[8rem] flex-wrap gap-1">
                    {parseProductBadges(p.badgesJson).map((id) => {
                      const b = badgePreset(id as ProductBadgeId);
                      return b ? (
                        <span
                          key={id}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ color: b.color, backgroundColor: b.bg }}
                        >
                          {b.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </td>
                <td>{formatTry(p.priceMinor)}</td>
                <td className="text-zinc-600">{p.variantCount > 0 ? p.variantCount : "—"}</td>
                <td>
                  <span
                    className={
                      p.stockQty <= (p.lowStockThreshold ?? 5) ? "font-medium text-red-600" : ""
                    }
                  >
                    {p.stockQty}
                  </span>
                </td>
                <td className="whitespace-nowrap text-right">
                  <AdminListRowActions
                    editHref={
                      p.kind === "bundle"
                        ? `/admin/bundles/${p.id}/edit`
                        : `/admin/products/${p.id}/edit`
                    }
                    previewHref={`/products/${p.slug}`}
                    apiUrl={
                      p.kind === "bundle"
                        ? `/api/admin/bundles/${p.id}`
                        : `/api/admin/products/${p.id}`
                    }
                    enabled={p.published}
                    flagField="published"
                    deleteConfirmText={`${p.title} ürününü silmek istediğinize emin misiniz?`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {products.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Henüz ürün yok.</p>
      ) : null}
    </div>
  );
}
