"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminField, btnSecondary, inputClass } from "@/components/admin/AdminForm";

type CategoryOption = { id: string; label: string };

type TrendyolAttribute = {
  attributeId: number;
  attributeName: string;
  required: boolean;
  allowCustom: boolean;
  varianter: boolean;
  values: { id: number; name: string }[];
};

type SavedMapping = {
  attributeId: number;
  attributeName: string;
  attributeValueId: number | null;
  attributeValueName: string | null;
  customValue: string | null;
  required: boolean;
};

export function MarketplaceAttributeMappingPanel({
  platform,
  categories,
  tablesReady = true,
}: {
  platform: string;
  categories: CategoryOption[];
  tablesReady?: boolean;
}) {
  const [localCategoryId, setLocalCategoryId] = useState("");
  const [trendyolCategoryId, setTrendyolCategoryId] = useState("");
  const [attributes, setAttributes] = useState<TrendyolAttribute[]>([]);
  const [saved, setSaved] = useState<Record<number, SavedMapping>>({});
  const [drafts, setDrafts] = useState<Record<number, { valueId: string; custom: string }>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadSaved = useCallback(async () => {
    const q = new URLSearchParams({ platform });
    if (localCategoryId) q.set("categoryId", localCategoryId);
    const res = await fetch(`/api/admin/integrations/marketplaces/mappings/attributes?${q}`);
    if (!res.ok) return;
    const json = (await res.json()) as { mappings?: SavedMapping[] };
    const map: Record<number, SavedMapping> = {};
    for (const m of json.mappings ?? []) map[m.attributeId] = m;
    setSaved(map);
  }, [platform, localCategoryId]);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  async function fetchAttributes() {
    const catId = Number(trendyolCategoryId.trim());
    if (!Number.isFinite(catId) || catId <= 0) {
      setMsg("Geçerli Trendyol kategori ID girin");
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch(
      `/api/admin/integrations/marketplaces/trendyol/category-attributes?categoryId=${catId}`,
    );
    const json = (await res.json()) as { attributes?: TrendyolAttribute[]; error?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(json.error ?? "Özellikler alınamadı");
      setAttributes([]);
      return;
    }
    setAttributes(json.attributes ?? []);
    await loadSaved();
    setMsg(`${json.attributes?.length ?? 0} özellik geldi. Zorunlu olanları eşleyin.`);
  }

  async function saveOne(attr: TrendyolAttribute) {
    const draft = drafts[attr.attributeId] ?? { valueId: "", custom: "" };
    const valueId = draft.valueId ? Number(draft.valueId) : null;
    const valueName = valueId
      ? (attr.values.find((v) => v.id === valueId)?.name ?? null)
      : null;
    const custom = draft.custom.trim() || null;
    if (!valueId && !custom) {
      setMsg(`${attr.attributeName}: değer seçin veya metin girin`);
      return;
    }
    const res = await fetch("/api/admin/integrations/marketplaces/mappings/attributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        categoryId: localCategoryId || null,
        attributeId: attr.attributeId,
        attributeName: attr.attributeName,
        attributeValueId: valueId,
        attributeValueName: valueName,
        customValue: custom,
        required: attr.required,
      }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setMsg(j.error ?? "Kaydedilemedi");
      return;
    }
    setMsg(`${attr.attributeName} kaydedildi`);
    await loadSaved();
  }

  async function removeOne(attributeId: number) {
    const q = new URLSearchParams({ platform, attributeId: String(attributeId) });
    if (localCategoryId) q.set("categoryId", localCategoryId);
    await fetch(`/api/admin/integrations/marketplaces/mappings/attributes?${q}`, {
      method: "DELETE",
    });
    await loadSaved();
  }

  if (platform !== "trendyol") return null;

  return (
    <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <h3 className="text-sm font-semibold">Kategori özellik eşlemesi (Trendyol attributes)</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Her Trendyol kategorisinin zorunlu özellikleri (renk, tür, içerik vb.) vardır. Bunları
        eşlemeden ürünler onaylanmaz. Yerel kategori seçip Trendyol kategori ID ile özellikleri
        çekin, zorunlu olanlara değer atayın.
      </p>

      {!tablesReady ? (
        <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Özellik tablosu için Prisma client güncellenmeli (deploy sonrası hazır olur).
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <AdminField label="Yerel kategori">
          <select
            className={inputClass}
            value={localCategoryId}
            onChange={(e) => setLocalCategoryId(e.target.value)}
          >
            <option value="">Varsayılan (tümü)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Trendyol kategori ID">
          <input
            className={inputClass}
            inputMode="numeric"
            value={trendyolCategoryId}
            onChange={(e) => setTrendyolCategoryId(e.target.value)}
            placeholder="örn. 411"
          />
        </AdminField>
        <div className="flex items-end">
          <button
            type="button"
            className={btnSecondary}
            disabled={busy || !tablesReady}
            onClick={() => void fetchAttributes()}
          >
            {busy ? "Getiriliyor…" : "Özellikleri getir"}
          </button>
        </div>
      </div>

      {msg ? <p className="mt-2 text-xs text-zinc-700">{msg}</p> : null}

      {attributes.length > 0 ? (
        <div className="mt-3 space-y-2">
          {attributes.map((attr) => {
            const savedRow = saved[attr.attributeId];
            const draft = drafts[attr.attributeId] ?? { valueId: "", custom: "" };
            return (
              <div
                key={attr.attributeId}
                className={`rounded border px-3 py-2 ${attr.required ? "border-red-200 bg-red-50/40" : "border-zinc-200 bg-white"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {attr.attributeName}
                    {attr.required ? <span className="ml-1 text-xs text-red-600">*zorunlu</span> : null}
                    {attr.varianter ? (
                      <span className="ml-1 text-xs text-zinc-400">(varyant)</span>
                    ) : null}
                  </span>
                  {savedRow ? (
                    <span className="text-xs text-green-700">
                      ✓ {savedRow.attributeValueName ?? savedRow.customValue}
                      <button
                        type="button"
                        className="ml-2 text-red-500 underline"
                        onClick={() => void removeOne(attr.attributeId)}
                      >
                        kaldır
                      </button>
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {attr.values.length > 0 ? (
                    <select
                      className={inputClass}
                      value={draft.valueId}
                      onChange={(e) =>
                        setDrafts({
                          ...drafts,
                          [attr.attributeId]: { valueId: e.target.value, custom: "" },
                        })
                      }
                    >
                      <option value="">Değer seç…</option>
                      {attr.values.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {attr.allowCustom ? (
                    <input
                      className={inputClass}
                      placeholder="Serbest metin (allowCustom)"
                      value={draft.custom}
                      onChange={(e) =>
                        setDrafts({
                          ...drafts,
                          [attr.attributeId]: { valueId: "", custom: e.target.value },
                        })
                      }
                    />
                  ) : null}
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => void saveOne(attr)}
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
