"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/admin/AdminForm";

type Template = {
  id: string;
  description: string;
  unit: string;
  unitPriceTl: number;
  vatRate: number;
  notes: string | null;
  sortOrder: number;
};

const UNITS = ["adet", "saat", "gün", "ay", "yıl", "kg", "m²", "m"];
const VAT_RATES = [0, 1, 10, 20];

function fmt(n: number) {
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function emptyForm() {
  return { description: "", unit: "adet", unitPriceTl: "", vatRate: 20, notes: "", sortOrder: 0 };
}

export function InvoiceLineTemplatesManager({ initial }: { initial: Template[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initial);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function startEdit(t: Template) {
    setEditId(t.id);
    setForm({
      description: t.description,
      unit: t.unit,
      unitPriceTl: String(t.unitPriceTl),
      vatRate: t.vatRate,
      notes: t.notes ?? "",
      sortOrder: t.sortOrder,
    });
    setErr(null);
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm());
    setErr(null);
  }

  async function save() {
    if (!form.description.trim()) { setErr("Açıklama zorunlu."); return; }
    const price = parseFloat(String(form.unitPriceTl).replace(",", "."));
    if (isNaN(price) || price < 0) { setErr("Geçerli bir fiyat girin."); return; }

    setBusy(true); setErr(null);
    const body = {
      description: form.description.trim(),
      unit: form.unit,
      unitPriceTl: price,
      vatRate: form.vatRate,
      notes: form.notes.trim() || undefined,
      sortOrder: form.sortOrder,
    };

    try {
      const url = editId
        ? `/api/admin/finance/invoice-lines/${editId}`
        : "/api/admin/finance/invoice-lines";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { template?: Template; error?: string };
      if (!res.ok) { setErr(data.error ?? "Hata"); return; }
      if (editId) {
        setTemplates((prev) => prev.map((t) => (t.id === editId ? data.template! : t)));
      } else {
        setTemplates((prev) => [...prev, data.template!]);
      }
      cancelEdit();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Bu kalemi silmek istiyor musunuz?")) return;
    const res = await fetch(`/api/admin/finance/invoice-lines/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (editId === id) cancelEdit();
    }
  }

  const isEditing = editId !== null;
  const activeTemplates = templates.filter((t) => t);

  return (
    <div className="space-y-6">
      {/* Liste */}
      <div className="admin-card admin-card-pad">
        <h2 className="font-semibold text-zinc-800">
          Kayıtlı Fatura Kalemleri
          {activeTemplates.length > 0 && (
            <span className="ml-2 text-sm font-normal text-zinc-400">({activeTemplates.length})</span>
          )}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Fatura keserken açıklama alanına yazmaya başlayınca bu kalemler önerilir. Seçince fiyat ve KDV otomatik dolar.
        </p>

        {activeTemplates.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">Henüz kalem yok. Aşağıdan ekleyin.</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2">Açıklama</th>
                <th className="pb-2">Birim</th>
                <th className="pb-2 text-right">Fiyat</th>
                <th className="pb-2 text-right">KDV</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {activeTemplates.map((t) => (
                <tr key={t.id} className={`border-b border-zinc-100 ${editId === t.id ? "bg-blue-50" : ""}`}>
                  <td className="py-2 pr-3">
                    <div className="font-medium text-zinc-800">{t.description}</div>
                    {t.notes && <div className="text-xs text-zinc-400">{t.notes}</div>}
                  </td>
                  <td className="py-2 pr-3 text-zinc-500">{t.unit}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmt(t.unitPriceTl)} ₺</td>
                  <td className="py-2 pr-3 text-right text-zinc-500">%{t.vatRate}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      className="mr-2 text-xs text-blue-600 hover:underline"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(t.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form */}
      <div className="admin-card admin-card-pad">
        <h2 className="font-semibold text-zinc-800">{isEditing ? "Kalemi Düzenle" : "Yeni Kalem Ekle"}</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-600">Açıklama *</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Örn. Web sitesi aylık bakım hizmeti"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Birim</label>
            <select
              className={inputClass}
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Birim Fiyat (TL) *</label>
            <input
              type="text"
              inputMode="decimal"
              className={inputClass}
              placeholder="0,00"
              value={form.unitPriceTl}
              onChange={(e) => setForm((f) => ({ ...f, unitPriceTl: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">KDV %</label>
            <select
              className={inputClass}
              value={form.vatRate}
              onChange={(e) => setForm((f) => ({ ...f, vatRate: Number(e.target.value) }))}
            >
              {VAT_RATES.map((r) => <option key={r} value={r}>%{r}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Not (isteğe bağlı)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="İç not veya kısa açıklama"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Kaydediliyor…" : isEditing ? "Güncelle" : "Ekle"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              İptal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
