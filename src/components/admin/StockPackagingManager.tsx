"use client";

import { useState } from "react";
import { formatStockBalance, type StockUnit } from "@/lib/stock/units";
import { btnPrimary, inputClass } from "@/components/admin/AdminForm";

type StockItemOpt = { id: string; name: string; unit: string; kind: string; balanceBase: number };
type ProductOpt = { id: string; title: string };
type RecipeLine = { stockItemId: string; qty: string; unit: string };

export function StockPackagingManager({
  stockItems,
  products,
  recipes,
}: {
  stockItems: StockItemOpt[];
  products: ProductOpt[];
  recipes: Array<{
    id: string;
    name: string;
    outputProduct: { id: string; title: string };
    lines: Array<{ stockItem: { id: string; name: string; unit: string }; qtyBasePerOutput: number }>;
  }>;
}) {
  const [recipeForm, setRecipeForm] = useState({
    name: "",
    outputProductId: products[0]?.id ?? "",
    lines: [{ stockItemId: stockItems[0]?.id ?? "", qty: "1", unit: "adet" }] as RecipeLine[],
  });
  const [runForm, setRunForm] = useState({
    recipeId: recipes[0]?.id ?? "",
    outputQty: "10",
    note: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveRecipe(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/stock/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recipeForm.name,
          outputProductId: recipeForm.outputProductId,
          lines: recipeForm.lines.map((l) => ({
            stockItemId: l.stockItemId,
            qtyBasePerOutput: Number(l.qty),
            unit: l.unit,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reçete kaydedilemedi");
      setMsg("Reçete kaydedildi. Sayfayı yenileyin.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  async function runPackaging(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const recipe = recipes.find((r) => r.id === runForm.recipeId);
      const res = await fetch("/api/admin/stock/packaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: runForm.recipeId,
          outputProductId: recipe?.outputProduct.id,
          outputQty: Number(runForm.outputQty),
          note: runForm.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Paketleme başarısız");
      setMsg(`${runForm.outputQty} adet paketlendi — stok güncellendi.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Yeni reçete</h2>
        <form onSubmit={saveRecipe} className="space-y-3">
          <input
            className={inputClass}
            placeholder="Reçete adı"
            value={recipeForm.name}
            onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })}
            required
          />
          <select
            className={inputClass}
            value={recipeForm.outputProductId}
            onChange={(e) => setRecipeForm({ ...recipeForm, outputProductId: e.target.value })}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          {recipeForm.lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2">
              <select
                className={inputClass}
                value={line.stockItemId}
                onChange={(e) => {
                  const lines = [...recipeForm.lines];
                  lines[idx] = { ...line, stockItemId: e.target.value };
                  setRecipeForm({ ...recipeForm, lines });
                }}
              >
                {stockItems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                className={inputClass}
                type="number"
                step="0.001"
                value={line.qty}
                onChange={(e) => {
                  const lines = [...recipeForm.lines];
                  lines[idx] = { ...line, qty: e.target.value };
                  setRecipeForm({ ...recipeForm, lines });
                }}
              />
              <select
                className={inputClass}
                value={line.unit}
                onChange={(e) => {
                  const lines = [...recipeForm.lines];
                  lines[idx] = { ...line, unit: e.target.value };
                  setRecipeForm({ ...recipeForm, lines });
                }}
              >
                <option value="adet">adet</option>
                <option value="kg">kg</option>
              </select>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-emerald-700 underline"
            onClick={() =>
              setRecipeForm({
                ...recipeForm,
                lines: [...recipeForm.lines, { stockItemId: stockItems[0]?.id ?? "", qty: "1", unit: "adet" }],
              })
            }
          >
            + Girdi satırı
          </button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            Reçeteyi kaydet
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Paketleme fişi</h2>
        <form onSubmit={runPackaging} className="space-y-3">
          <select
            className={inputClass}
            value={runForm.recipeId}
            onChange={(e) => setRunForm({ ...runForm, recipeId: e.target.value })}
          >
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} → {r.outputProduct.title}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            type="number"
            min={1}
            value={runForm.outputQty}
            onChange={(e) => setRunForm({ ...runForm, outputQty: e.target.value })}
            placeholder="Üretilen paket adedi"
          />
          <input
            className={inputClass}
            value={runForm.note}
            onChange={(e) => setRunForm({ ...runForm, note: e.target.value })}
            placeholder="Not (opsiyonel)"
          />
          <button type="submit" className={btnPrimary} disabled={busy || !recipes.length}>
            Paketle ve stoka işle
          </button>
        </form>

        <div>
          <h3 className="mb-2 font-medium">Mevcut reçeteler</h3>
          <ul className="space-y-2 text-sm">
            {recipes.map((r) => (
              <li key={r.id} className="rounded-lg bg-zinc-50 px-3 py-2">
                <div className="font-medium">{r.name}</div>
                <div className="text-zinc-600">Çıktı: {r.outputProduct.title}</div>
                <ul className="mt-1 text-xs text-zinc-500">
                  {r.lines.map((l, i) => (
                    <li key={i}>
                      {l.stockItem.name}:{" "}
                      {l.stockItem.unit === "kg"
                        ? formatStockBalance(l.qtyBasePerOutput, "kg" as StockUnit)
                        : `${l.qtyBasePerOutput} adet`}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {msg ? <p className="lg:col-span-2 text-sm text-zinc-700">{msg}</p> : null}
    </div>
  );
}

export function StockInvoiceMappingsManager({
  mappings,
  stockItems,
}: {
  mappings: Array<{ id: string; descriptionNorm: string; invoiceUnit: string; stockItem: { name: string } }>;
  stockItems: StockItemOpt[];
}) {
  const [form, setForm] = useState({ description: "", stockItemId: stockItems[0]?.id ?? "", invoiceUnit: "kg" });
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/stock/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Hata");
      return;
    }
    setMsg("Eşleme kaydedildi. Sayfayı yenileyin.");
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        GİB / alış faturası satır açıklamalarını stok kartına bağlayın. Fatura onayında otomatik stok girişi yapılır.
      </p>
      <form onSubmit={save} className="grid gap-3 md:grid-cols-4">
        <input
          className={inputClass}
          placeholder="Fatura satır açıklaması"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
        <select
          className={inputClass}
          value={form.stockItemId}
          onChange={(e) => setForm({ ...form, stockItemId: e.target.value })}
        >
          {stockItems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          value={form.invoiceUnit}
          onChange={(e) => setForm({ ...form, invoiceUnit: e.target.value })}
        >
          <option value="kg">kg</option>
          <option value="adet">adet</option>
          <option value="gram">gram</option>
        </select>
        <button type="submit" className={btnPrimary}>
          Eşleme kaydet
        </button>
      </form>
      {msg ? <p className="text-sm">{msg}</p> : null}
      <ul className="text-sm">
        {mappings.map((m) => (
          <li key={m.id} className="border-b border-zinc-100 py-2">
            <span className="font-medium">{m.descriptionNorm}</span> → {m.stockItem.name} ({m.invoiceUnit})
          </li>
        ))}
      </ul>
    </div>
  );
}
