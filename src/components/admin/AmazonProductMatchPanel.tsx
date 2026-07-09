"use client";

import { useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";

type CategoryOption = { id: string; label: string };

type ProductRow = {
  id: string;
  title: string;
  sku: string | null;
  amazonSku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  categoryTitle: string | null;
  stockQty: number;
  searchText: string;
  listingStatus: string;
  lastError: string | null;
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  none: { text: "gönderilmedi", cls: "text-zinc-400" },
  pending: { text: "Amazon onayında", cls: "text-amber-600" },
  active: { text: "yayında", cls: "text-green-600" },
  inactive: { text: "pasif", cls: "text-zinc-500" },
  rejected: { text: "reddedildi", cls: "text-red-600" },
  exported: { text: "gönderildi", cls: "text-blue-600" },
  error: { text: "hata", cls: "text-red-600" },
};

export function AmazonProductMatchPanel({
  categories,
  tablesReady = true,
}: {
  categories: CategoryOption[];
  tablesReady?: boolean;
}) {
  const [localCategoryId, setLocalCategoryId] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function loadProducts() {
    setBusy(true);
    setMsg(null);
    try {
      const qs = new URLSearchParams();
      if (localCategoryId) qs.set("categoryId", localCategoryId);
      const res = await fetch(`/api/admin/integrations/marketplaces/amazon/products?${qs}`);
      const json = (await res.json().catch(() => ({}))) as { products?: ProductRow[]; error?: string };
      if (!res.ok) {
        setMsg(json.error ?? "Ürünler yüklenemedi");
        return;
      }
      setProducts(json.products ?? []);
      setSelected(new Set());
      setLoaded(true);
      setMsg(`${json.products?.length ?? 0} ürün listelendi`);
    } catch {
      setMsg("Bağlantı hatası — tekrar deneyin");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOnAmazon() {
    setVerifyBusy(true);
    setMsg("Amazon'da ilan durumları kontrol ediliyor…");
    try {
      const res = await fetch("/api/admin/integrations/marketplaces/amazon/verify", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        setMsg(json.error ?? "Doğrulama başarısız");
        return;
      }
      setMsg(json.message ?? "Doğrulandı");
      if (loaded) await loadProducts();
    } catch {
      setMsg("Doğrulama hatası");
    } finally {
      setVerifyBusy(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === visibleProducts.length) setSelected(new Set());
    else setSelected(new Set(visibleProducts.map((p) => p.id)));
  }

  async function sendSelected() {
    const ids = [...selected];
    if (ids.length === 0) {
      setMsg("Gönderilecek ürün seçin");
      return;
    }
    setSending(true);
    setMsg(`${ids.length} ürün Amazon'a gönderiliyor… (birkaç dakika sürebilir)`);
    try {
      const res = await fetch("/api/admin/integrations/marketplaces/amazon/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        result?: { ok: boolean; message: string };
        error?: string;
      };
      if (!res.ok) {
        setMsg(json.error ?? "Gönderim başarısız");
        return;
      }
      setMsg(json.result?.message ?? "Gönderildi");
      if (loaded) await loadProducts();
    } catch {
      setMsg("Gönderim hatası veya zaman aşımı");
    } finally {
      setSending(false);
    }
  }

  const visibleProducts = products.filter((p) => {
    if (statusFilter !== "all" && p.listingStatus !== statusFilter) return false;
    return search.trim() ? p.searchText.includes(search.trim().toLocaleLowerCase("tr")) : true;
  });

  const selectedRows = products.filter((p) => selected.has(p.id));
  const sendLabel =
    selectedRows.length === 0
      ? "Seçiliyi gönder"
      : selectedRows.every((p) => p.listingStatus === "none")
        ? `Seçiliyi gönder (${selected.size})`
        : selectedRows.every((p) => p.listingStatus !== "none")
          ? `Seçiliyi güncelle (${selected.size})`
          : `Seçiliyi gönder/güncelle (${selected.size})`;

  const counts = {
    none: products.filter((p) => p.listingStatus === "none").length,
    pending: products.filter((p) => p.listingStatus === "pending").length,
    active: products.filter((p) => p.listingStatus === "active").length,
    rejected: products.filter((p) => p.listingStatus === "rejected").length,
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-950">Amazon ürün gönderimi</p>
        <p className="mt-1 text-xs text-blue-900">
          Köpek maması/ödülü ürünleri otomatik <strong>PET_FOOD</strong> türüyle gönderilir. Kategori
          seçip tüm ürünleri listeleyin, göndermek istediklerinizi işaretleyin. Reddedilenlerin hata
          nedeni <strong>Durum</strong> sütununda görünür; düzeltip tekrar gönderin. Toplu katalog çekme
          draft uygulamalarda kısıtlı — durum için <strong>Amazon&apos;da doğrula</strong> kullanın.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm font-semibold">Ürün listesi & gönderim</p>
        {!tablesReady ? (
          <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Pazaryeri tabloları için deploy sonrası hazır olur.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[16rem] flex-1">
            <AdminField label="Kategori (isteğe bağlı)">
              <select
                className={inputClass}
                value={localCategoryId}
                onChange={(e) => setLocalCategoryId(e.target.value)}
              >
                <option value="">Tüm kategoriler</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>
          <button type="button" className={btnPrimary} disabled={busy} onClick={() => void loadProducts()}>
            {busy ? "Yükleniyor…" : "Ürünleri getir"}
          </button>
        </div>
      </div>

      {loaded && products.length > 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b p-3 text-xs text-zinc-600">
            <span>{products.length} ürün</span>
            <span>· gönderilmedi {counts.none}</span>
            <span>· onayda {counts.pending}</span>
            <span>· yayında {counts.active}</span>
            <span>· reddedildi {counts.rejected}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <input
              className={`${inputClass} max-w-[16rem]`}
              placeholder="Ürün ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <AdminField label="Durum filtresi">
              <select
                className={`${inputClass} text-xs`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tümü</option>
                <option value="none">Gönderilmedi</option>
                <option value="pending">Onay bekliyor</option>
                <option value="active">Yayında</option>
                <option value="inactive">Pasif</option>
                <option value="rejected">Reddedildi</option>
              </select>
            </AdminField>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                className={btnSecondary}
                disabled={verifyBusy || sending}
                onClick={() => void verifyOnAmazon()}
              >
                {verifyBusy ? "…" : "Amazon'da doğrula"}
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={sending || selected.size === 0}
                onClick={() => void sendSelected()}
              >
                {sending ? "Gönderiliyor…" : sendLabel}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="p-2 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === visibleProducts.length && visibleProducts.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="p-2 text-left">Ürün</th>
                  <th className="p-2 text-left">Kategori</th>
                  <th className="p-2 text-left">SKU / Barkod</th>
                  <th className="p-2 text-left">Stok</th>
                  <th className="p-2 text-left">Durum</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((p) => {
                  const status = STATUS_LABEL[p.listingStatus] ?? STATUS_LABEL.none;
                  return (
                    <tr key={p.id} className="border-t align-top">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" className="h-9 w-9 rounded object-cover" />
                          ) : (
                            <div className="h-9 w-9 rounded bg-zinc-100" />
                          )}
                          <div className="min-w-[12rem]">
                            <p className="font-medium leading-tight">{p.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-xs text-zinc-600">{p.categoryTitle ?? "—"}</td>
                      <td className="p-2 text-xs text-zinc-600">
                        <p>SKU: {p.amazonSku || p.sku || "—"}</p>
                        <p>
                          Barkod:{" "}
                          {p.barcode ? (
                            p.barcode
                          ) : (
                            <span className="text-amber-700">yok — otomatik üretilir</span>
                          )}
                        </p>
                      </td>
                      <td className="p-2 text-xs">{p.stockQty}</td>
                      <td className="p-2">
                        <span className={`text-xs ${status.cls}`}>{status.text}</span>
                        {p.lastError ? (
                          <p className="mt-0.5 max-w-[14rem] text-[11px] text-red-600">{p.lastError}</p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleProducts.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">Filtreye uyan ürün yok.</p>
          ) : null}
        </div>
      ) : null}

      {loaded && products.length === 0 && !busy ? (
        <p className="text-sm text-zinc-500">Bu kategoride yayında ürün bulunamadı.</p>
      ) : null}

      {msg ? <p className="text-sm text-zinc-700">{msg}</p> : null}
    </div>
  );
}
