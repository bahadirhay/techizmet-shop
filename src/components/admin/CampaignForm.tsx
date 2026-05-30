"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import type { CampaignFormData } from "@/lib/admin/campaign-form";
import { CAMPAIGN_TYPES } from "@/lib/campaign-engine";

type Option = { id: string; label: string };

function MultiCheck({
  options,
  selected,
  onChange,
}: {
  options: Option[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (!options.length) return <p className="text-sm text-zinc-500">Kayıt yok</p>;
  return (
    <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
      {options.map((o) => (
        <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(o.id)}
            onChange={() =>
              onChange(
                selected.includes(o.id) ? selected.filter((x) => x !== o.id) : [...selected, o.id],
              )
            }
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

function ProductMultiCheck({
  options,
  selected,
  onChange,
}: {
  options: Option[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabels = useMemo(
    () =>
      selected
        .map((id) => options.find((o) => o.id === id))
        .filter(Boolean) as Option[],
    [selected, options],
  );

  if (!options.length) return <p className="text-sm text-zinc-500">Ürün yok</p>;

  return (
    <div className="space-y-2">
      {selectedLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selectedLabels.map((o) => (
            <button
              key={o.id}
              type="button"
              className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 hover:bg-emerald-200"
              onClick={() => onChange(selected.filter((id) => id !== o.id))}
            >
              {o.label} ×
            </button>
          ))}
        </div>
      ) : null}
      <input
        type="search"
        className={inputClass}
        placeholder="Ürün ara (ad, SKU)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-500">Eşleşen ürün yok</p>
        ) : (
          filtered.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(o.id)}
                onChange={() =>
                  onChange(
                    selected.includes(o.id)
                      ? selected.filter((x) => x !== o.id)
                      : [...selected, o.id],
                  )
                }
              />
              <span className="truncate">{o.label}</span>
            </label>
          ))
        )}
      </div>
      <p className="text-xs text-zinc-500">{selected.length} ürün seçili</p>
    </div>
  );
}

export function CampaignForm({
  initial,
  categories = [],
  collections = [],
  brands = [],
  products = [],
}: {
  initial: CampaignFormData;
  categories?: Option[];
  collections?: Option[];
  brands?: Option[];
  products?: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof CampaignFormData>(key: K, val: CampaignFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const url = form.id ? `/api/admin/campaigns/${form.id}` : "/api/admin/campaigns";
    const res = await fetch(url, {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        categoryIds: form.categoryIds,
        collectionIds: form.collectionIds,
        brandIds: form.brandIds,
        productIds: form.productIds,
      }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Kayıt başarısız");
      return;
    }
    router.push("/admin/campaigns");
    router.refresh();
  }

  const hasScope =
    form.categoryIds.length > 0 ||
    form.collectionIds.length > 0 ||
    form.brandIds.length > 0 ||
    form.productIds.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{form.id ? "Kampanya düzenle" : "Yeni kampanya"}</h1>
        <button type="button" className={btnSecondary} onClick={() => router.back()}>
          Geri
        </button>
      </div>
      <div className="space-y-4 rounded-xl border bg-white p-6">
        <AdminField label="Kampanya adı *">
          <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </AdminField>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.autoApply}
            onChange={(e) => {
              set("autoApply", e.target.checked);
              if (e.target.checked) set("code", "");
            }}
          />
          Otomatik uygula (kodsuz — sepette otomatik devreye girer)
        </label>

        {!form.autoApply ? (
          <AdminField label="Kupon kodu">
            <input
              className={inputClass}
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="YAZ2026"
            />
          </AdminField>
        ) : null}

        <AdminField label="Tür *">
          <select className={inputClass} value={form.type} onChange={(e) => set("type", e.target.value)}>
            {CAMPAIGN_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </AdminField>

        {form.type === "percent_off" ? (
          <AdminField label="İndirim oranı (%)">
            <input
              type="number"
              min={1}
              max={100}
              className={inputClass}
              value={form.percentOff}
              onChange={(e) => set("percentOff", e.target.value)}
            />
          </AdminField>
        ) : null}

        {form.type === "fixed_off" ? (
          <AdminField label="İndirim tutarı (TL)">
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.amountOff}
              onChange={(e) => set("amountOff", e.target.value)}
            />
          </AdminField>
        ) : null}

        {form.type === "buy_x_pay_y" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Kaç adet al (X)" hint="örn. 3">
              <input
                type="number"
                min={2}
                className={inputClass}
                value={form.buyQuantity}
                onChange={(e) => set("buyQuantity", e.target.value)}
              />
            </AdminField>
            <AdminField label="Kaç adet öde (Y)" hint="örn. 2 → 1 bedava">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.payQuantity}
                onChange={(e) => set("payQuantity", e.target.value)}
              />
            </AdminField>
          </div>
        ) : null}

        {form.type !== "free_shipping" ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.freeShipping}
              onChange={(e) => set("freeShipping", e.target.checked)}
            />
            Bu kampanyada ücretsiz kargo da uygula
          </label>
        ) : null}

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="mb-3 text-sm font-medium text-zinc-800">Kapsam (isteğe bağlı)</p>
          <p className="mb-3 text-xs text-zinc-500">
            Boş bırakılırsa tüm ürünler. Belirli ürün, kategori, koleksiyon veya marka ile sınırlayabilirsiniz.
          </p>
          <div className="space-y-3">
            <AdminField label="Ürünler" hint="Yalnızca seçili ürünlerde geçerli">
              <ProductMultiCheck
                options={products}
                selected={form.productIds}
                onChange={(ids) => set("productIds", ids)}
              />
            </AdminField>
            <AdminField label="Kategoriler">
              <MultiCheck
                options={categories}
                selected={form.categoryIds}
                onChange={(ids) => set("categoryIds", ids)}
              />
            </AdminField>
            <AdminField label="Koleksiyonlar">
              <MultiCheck
                options={collections}
                selected={form.collectionIds}
                onChange={(ids) => set("collectionIds", ids)}
              />
            </AdminField>
            <AdminField label="Markalar">
              <MultiCheck
                options={brands}
                selected={form.brandIds}
                onChange={(ids) => set("brandIds", ids)}
              />
            </AdminField>
          </div>
          {hasScope ? (
            <p className="mt-2 text-xs text-emerald-700">Kapsamlı kampanya — yalnızca seçili ürünler</p>
          ) : null}
        </div>

        <AdminField label="Minimum sepet (TL)">
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={form.minCart}
            onChange={(e) => set("minCart", e.target.value)}
          />
        </AdminField>
        <AdminField label="Kullanım limiti">
          <input
            type="number"
            className={inputClass}
            value={form.maxUses}
            onChange={(e) => set("maxUses", e.target.value)}
            placeholder="Sınırsız için boş"
          />
        </AdminField>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Başlangıç">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.startsAt}
              onChange={(e) => set("startsAt", e.target.value)}
            />
          </AdminField>
          <AdminField label="Bitiş">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.endsAt}
              onChange={(e) => set("endsAt", e.target.value)}
            />
          </AdminField>
        </div>
        <AdminField label="Açıklama (admin)">
          <textarea
            className={inputClass}
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </AdminField>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
          Aktif
        </label>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button type="button" className={btnPrimary} onClick={save} disabled={busy}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
