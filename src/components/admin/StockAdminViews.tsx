"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { formatStockBalance, formatLedgerQty, type StockUnit } from "@/lib/stock/units";
import { btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

type ItemRow = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  kind: string;
  unit: string;
  balanceBase: number;
  lowStockThreshold: number;
  active: boolean;
  product: { id: string; title: string } | null;
};

const KIND_LABEL: Record<string, string> = {
  raw_material: "Hammadde",
  packaging: "Ambalaj",
  finished: "Mamul",
};

export function StockItemsManager({ initialItems }: { initialItems: ItemRow[] }) {
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    kind: "raw_material",
    unit: "kg",
    lowStockThreshold: "0",
    initialBalance: "0",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ barcode: "", imageUrl: "" });

  async function reloadItems() {
    const list = await fetch("/api/admin/stock/items").then((r) => r.json());
    setItems(list.items);
  }

  async function syncFromCatalog() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/stock/sync-products", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Senkron başarısız");
      await reloadItems();
      setMsg(
        `${data.created} yeni mamul kartı eklendi, ${data.updated} kart güncellendi (${data.totalProducts} ürün tarandı).`,
      );
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  async function saveItemMeta(itemId: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/stock/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: editDraft.barcode,
          imageUrl: editDraft.imageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kayıt başarısız");
      await reloadItems();
      setEditingId(null);
      setMsg("Kart güncellendi.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/stock/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lowStockThreshold: Number(form.lowStockThreshold),
          initialBalance: Number(form.initialBalance),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kayıt başarısız");
      const list = await fetch("/api/admin/stock/items").then((r) => r.json());
      setItems(list.items);
      setForm({ name: "", sku: "", barcode: "", kind: "raw_material", unit: "kg", lowStockThreshold: "0", initialBalance: "0" });
      setMsg("Stok kartı oluşturuldu.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  const low = useMemo(() => items.filter((i) => i.active && i.balanceBase <= i.lowStockThreshold), [items]);

  const [manual, setManual] = useState({
    stockItemId: items[0]?.id ?? "",
    qty: "",
    note: "",
  });

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/stock/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockItemId: manual.stockItemId,
          qty: Number(manual.qty),
          note: manual.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Giriş başarısız");
      const list = await fetch("/api/admin/stock/items").then((r) => r.json());
      setItems(list.items);
      setManual((m) => ({ ...m, qty: "", note: "" }));
      setMsg("Manuel stok girişi kaydedildi.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3">
        <button type="button" className={btnPrimary} disabled={busy} onClick={syncFromCatalog}>
          Sitedeki mamülleri stoka aktar
        </button>
        <p className="text-sm text-sky-900">
          Tüm ürünler mamul kartı olarak eklenir; mevcut stok miktarları açılış bakiyesi yazılır. Barkod ve görsel üründen gelir, sonra değiştirebilirsiniz.
        </p>
      </div>

      {low.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {low.length} kart eşik altında: {low.map((i) => i.name).join(", ")}
        </div>
      ) : null}

      <form
        onSubmit={submitManual}
        className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 md:grid-cols-4"
      >
        <h3 className="md:col-span-4 text-sm font-semibold text-emerald-900">Manuel stok girişi / çıkışı</h3>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block font-medium">Stok kartı</span>
          <select
            className={inputClass}
            value={manual.stockItemId}
            onChange={(e) => setManual({ ...manual, stockItemId: e.target.value })}
            required
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({formatStockBalance(i.balanceBase, i.unit as StockUnit)})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Miktar (+ giriş / − çıkış)</span>
          <input
            className={inputClass}
            type="number"
            step="0.001"
            placeholder="ör. 25 veya -2"
            value={manual.qty}
            onChange={(e) => setManual({ ...manual, qty: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Not</span>
          <input
            className={inputClass}
            value={manual.note}
            onChange={(e) => setManual({ ...manual, note: e.target.value })}
            placeholder="Sayım, fire, düzeltme…"
          />
        </label>
        <div className="md:col-span-4 flex items-center gap-3">
          <button type="submit" className={btnPrimary} disabled={busy || !items.length}>
            Stok hareketi kaydet
          </button>
          <span className="text-xs text-zinc-600">Kg kartlarında miktar kilogram olarak girilir.</span>
        </div>
      </form>

      <form onSubmit={createItem} className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Ad</span>
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">SKU</span>
          <input className={inputClass} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Barkod</span>
          <input
            className={inputClass}
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            placeholder="Opsiyonel"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Tür</span>
          <select className={inputClass} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="raw_material">Hammadde</option>
            <option value="packaging">Ambalaj</option>
            <option value="finished">Mamul</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Birim</span>
          <select className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            <option value="kg">kg</option>
            <option value="adet">adet</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Açılış bakiyesi</span>
          <input
            className={inputClass}
            type="number"
            step="0.001"
            value={form.initialBalance}
            onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Düşük stok eşiği</span>
          <input
            className={inputClass}
            type="number"
            value={form.lowStockThreshold}
            onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
          />
        </label>
        <div className="md:col-span-3 flex items-center gap-3">
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? "Kaydediliyor…" : "Stok kartı ekle"}
          </button>
          {msg ? <span className="text-sm text-zinc-600">{msg}</span> : null}
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Görsel</th>
              <th className="px-3 py-2">Ad</th>
              <th className="px-3 py-2">Barkod</th>
              <th className="px-3 py-2">Tür</th>
              <th className="px-3 py-2">Bakiye</th>
              <th className="px-3 py-2">Ürün</th>
              <th className="px-3 py-2">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <Fragment key={i.id}>
                <tr className="border-t border-zinc-100">
                  <td className="px-3 py-2">
                    {i.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">{i.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-600">{i.barcode || "—"}</td>
                  <td className="px-3 py-2">{KIND_LABEL[i.kind] ?? i.kind}</td>
                  <td className="px-3 py-2">{formatStockBalance(i.balanceBase, i.unit as StockUnit)}</td>
                  <td className="px-3 py-2 text-zinc-600">{i.product?.title ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={btnSecondary}
                        disabled={busy}
                        onClick={() => {
                          setManual({ stockItemId: i.id, qty: "1", note: "Hızlı giriş" });
                        }}
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        className={btnSecondary}
                        disabled={busy}
                        onClick={() => {
                          setEditingId(editingId === i.id ? null : i.id);
                          setEditDraft({ barcode: i.barcode ?? "", imageUrl: i.imageUrl ?? "" });
                        }}
                      >
                        {editingId === i.id ? "Kapat" : "Düzenle"}
                      </button>
                    </div>
                  </td>
                </tr>
                {editingId === i.id ? (
                  <tr className="border-t border-zinc-100 bg-zinc-50/80">
                    <td colSpan={7} className="px-3 py-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium">Barkod</span>
                          <input
                            className={inputClass}
                            value={editDraft.barcode}
                            onChange={(e) => setEditDraft({ ...editDraft, barcode: e.target.value })}
                            placeholder="EAN / dahili kod"
                          />
                        </label>
                        <ImageUploadField
                          label="Görsel"
                          value={editDraft.imageUrl}
                          onChange={(url) => setEditDraft({ ...editDraft, imageUrl: url })}
                          hint="Mamul kartlarında ürün görseli varsayılan gelir; buradan değiştirebilirsiniz."
                          maxEdgePx={1200}
                        />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          className={btnPrimary}
                          disabled={busy}
                          onClick={() => saveItemMeta(i.id)}
                        >
                          Kaydet
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StockReportView({
  initialSummary,
  initialLedger,
  from,
  to,
}: {
  initialSummary: Array<{
    stockItemId: string;
    name: string;
    kind: string;
    unit: StockUnit;
    openingBase: number;
    inBase: number;
    outBase: number;
    closingBase: number;
  }>;
  initialLedger: Array<{
    id: string;
    occurredAt: string;
    stockItemName: string;
    unit: StockUnit;
    type: string;
    qtyBase: number;
    balanceAfter: number;
    refType: string;
    refId: string;
    note: string | null;
  }>;
  from: string;
  to: string;
}) {
  return (
    <div className="space-y-8">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Başlangıç</span>
          <input className={inputClass} type="date" name="from" defaultValue={from} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Bitiş</span>
          <input className={inputClass} type="date" name="to" defaultValue={to} />
        </label>
        <button type="submit" className={btnPrimary}>
          Filtrele
        </button>
        <Link href="/admin/stock/items" className="text-sm text-emerald-700 underline">
          Stok kartları
        </Link>
        <Link href="/admin/stock/packaging" className="text-sm text-emerald-700 underline">
          Paketleme
        </Link>
      </form>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Dönem özeti</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Kart</th>
                <th className="px-3 py-2">Açılış</th>
                <th className="px-3 py-2">Giriş</th>
                <th className="px-3 py-2">Çıkış</th>
                <th className="px-3 py-2">Kapanış</th>
              </tr>
            </thead>
            <tbody>
              {initialSummary.map((r) => (
                <tr key={r.stockItemId} className="border-t border-zinc-100">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{formatStockBalance(r.openingBase, r.unit)}</td>
                  <td className="px-3 py-2 text-emerald-700">{formatLedgerQty(r.inBase, r.unit)}</td>
                  <td className="px-3 py-2 text-red-700">{formatLedgerQty(-r.outBase, r.unit)}</td>
                  <td className="px-3 py-2 font-semibold">{formatStockBalance(r.closingBase, r.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Hareket defteri</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">Kart</th>
                <th className="px-3 py-2">Tür</th>
                <th className="px-3 py-2">Miktar</th>
                <th className="px-3 py-2">Bakiye</th>
                <th className="px-3 py-2">Kaynak</th>
              </tr>
            </thead>
            <tbody>
              {initialLedger.map((m) => (
                <tr key={m.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(m.occurredAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-3 py-2">{m.stockItemName}</td>
                  <td className="px-3 py-2">{m.type}</td>
                  <td className="px-3 py-2">{formatLedgerQty(m.qtyBase, m.unit)}</td>
                  <td className="px-3 py-2">{formatStockBalance(m.balanceAfter, m.unit)}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {m.refType}:{m.refId.slice(0, 8)}
                    {m.note ? ` — ${m.note}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
