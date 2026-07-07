"use client";

import { useCallback, useEffect, useState } from "react";
import { btnSecondary, inputClass } from "@/components/admin/AdminForm";

type Attr = {
  attributeId: number;
  attributeName: string;
  required: boolean;
  allowCustom: boolean;
  varianter: boolean;
  values: { id: number; name: string }[];
};

type Override = {
  attributeId: number;
  attributeName?: string;
  attributeValueId?: number | null;
  attributeValueName?: string | null;
  customValue?: string | null;
};

export function ProductTrendyolAttributes({
  productId,
  productCategoryId,
  initialAttributes = [],
  trendyolActive = false,
}: {
  productId: string;
  productCategoryId: string | null;
  initialAttributes?: Override[];
  trendyolActive?: boolean;
}) {
  const [trCatId, setTrCatId] = useState("");
  const [attrs, setAttrs] = useState<Attr[]>([]);
  const [catLevel, setCatLevel] = useState<Record<number, string>>({});
  const [draft, setDraft] = useState<Record<number, { valueId: string; custom: string }>>(() => {
    const d: Record<number, { valueId: string; custom: string }> = {};
    for (const a of initialAttributes) {
      d[a.attributeId] = {
        valueId: a.attributeValueId != null ? String(a.attributeValueId) : "",
        custom: a.customValue ?? "",
      };
    }
    return d;
  });
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    // 1) Yerel kategori -> Trendyol kategori ID
    const mapRes = await fetch(
      "/api/admin/integrations/marketplaces/mappings/categories?platform=trendyol",
    );
    const mapJson = (await mapRes.json()) as {
      mappings?: { categoryId: string | null; platformCategoryId: string }[];
    };
    const mappings = mapJson.mappings ?? [];
    const specific = mappings.find((m) => m.categoryId === productCategoryId);
    const fallback = mappings.find((m) => m.categoryId === null);
    const platformCatId = specific?.platformCategoryId ?? fallback?.platformCategoryId ?? "";
    setTrCatId(platformCatId);
    if (!platformCatId) {
      setBusy(false);
      setLoaded(true);
      return;
    }

    // 2) Trendyol kategori özellikleri
    const attrRes = await fetch(
      `/api/admin/integrations/marketplaces/trendyol/category-attributes?categoryId=${platformCatId}`,
    );
    const attrJson = (await attrRes.json()) as { attributes?: Attr[]; error?: string };
    if (!attrRes.ok) {
      setMsg(attrJson.error ?? "Özellikler alınamadı");
      setBusy(false);
      setLoaded(true);
      return;
    }
    setAttrs(attrJson.attributes ?? []);

    // 3) Kategori seviyesi eşlemeler (varsayılan + kategoriye özel)
    const level: Record<number, string> = {};
    for (const cat of [null, productCategoryId]) {
      const q = new URLSearchParams({ platform: "trendyol" });
      if (cat) q.set("categoryId", cat);
      const r = await fetch(`/api/admin/integrations/marketplaces/mappings/attributes?${q}`);
      if (!r.ok) continue;
      const j = (await r.json()) as {
        mappings?: { attributeId: number; attributeValueName: string | null; customValue: string | null }[];
      };
      for (const m of j.mappings ?? []) {
        const v = m.attributeValueName ?? m.customValue;
        if (v) level[m.attributeId] = v;
      }
    }
    setCatLevel(level);
    setBusy(false);
    setLoaded(true);
  }, [productCategoryId]);

  useEffect(() => {
    if (trendyolActive) void load();
  }, [trendyolActive, load]);

  async function save() {
    setSaving(true);
    setMsg(null);
    const attributes: Override[] = [];
    for (const a of attrs) {
      const d = draft[a.attributeId];
      if (!d) continue;
      if (d.valueId) {
        attributes.push({
          attributeId: a.attributeId,
          attributeName: a.attributeName,
          attributeValueId: Number(d.valueId),
          attributeValueName: a.values.find((v) => v.id === Number(d.valueId))?.name ?? null,
        });
      } else if (d.custom.trim()) {
        attributes.push({
          attributeId: a.attributeId,
          attributeName: a.attributeName,
          customValue: d.custom.trim(),
        });
      }
    }
    const res = await fetch(`/api/admin/products/${productId}/marketplace-attributes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "trendyol", attributes }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setMsg(j.error ?? "Kaydedilemedi");
      return;
    }
    setMsg(`Kaydedildi (${attributes.length} özellik bu ürüne yazıldı)`);
  }

  if (!trendyolActive) return null;

  const requiredAttrs = attrs.filter((a) => a.required);
  const optionalAttrs = attrs.filter((a) => !a.required);

  const renderAttr = (a: Attr) => {
    const d = draft[a.attributeId] ?? { valueId: "", custom: "" };
    const covered = catLevel[a.attributeId];
    const hasOverride = d.valueId || d.custom.trim();
    return (
      <div
        key={a.attributeId}
        className={`rounded border px-3 py-2 ${a.required ? "border-red-200 bg-red-50/40" : "border-zinc-200 bg-white"}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {a.attributeName}
            {a.required ? <span className="ml-1 text-xs text-red-600">*</span> : null}
            {a.varianter ? <span className="ml-1 text-xs text-violet-500">(varyant)</span> : null}
          </span>
          {covered && !hasOverride ? (
            <span className="text-xs text-green-700">kategori genelinden: {covered}</span>
          ) : null}
        </div>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {a.values.length > 0 ? (
            <select
              className={inputClass}
              value={d.valueId}
              onChange={(e) =>
                setDraft({ ...draft, [a.attributeId]: { valueId: e.target.value, custom: "" } })
              }
            >
              <option value="">{covered ? `Kategori geneli (${covered})` : "Seç…"}</option>
              {a.values.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          ) : null}
          {a.allowCustom ? (
            <input
              className={inputClass}
              placeholder="Serbest metin"
              value={d.custom}
              onChange={(e) =>
                setDraft({ ...draft, [a.attributeId]: { valueId: "", custom: e.target.value } })
              }
            />
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-orange-950">Trendyol ürün özellikleri</p>
        <p className="mt-1 text-xs text-orange-900">
          Aroma, gramaj gibi <strong>bu ürüne özel</strong> özellikleri buradan ayarlayın. Sabit
          özellikler (hayvan türü vb.) kategori genelinden gelir; sadece değişkenleri doldurmanız
          yeterli.
        </p>
      </div>

      {busy ? <p className="text-xs text-orange-900">Özellikler yükleniyor…</p> : null}

      {loaded && !trCatId ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Bu ürünün kategorisi için Trendyol kategori eşlemesi yok. Önce{" "}
          <a href="/admin/integrations?platform=trendyol" className="underline">
            Pazaryeri → Trendyol → Kategori eşlemesi
          </a>{" "}
          bölümünden eşleyin.
        </p>
      ) : null}

      {loaded && trCatId && attrs.length === 0 && !busy ? (
        <p className="text-xs text-orange-900">Bu kategoride tanımlı özellik bulunamadı.</p>
      ) : null}

      {requiredAttrs.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-red-700">Zorunlu</p>
          {requiredAttrs.map(renderAttr)}
        </div>
      ) : null}

      {optionalAttrs.length > 0 ? (
        <details className="rounded border border-zinc-200 bg-white/60">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-600">
            İsteğe bağlı özellikler ({optionalAttrs.length})
          </summary>
          <div className="space-y-2 p-2">{optionalAttrs.map(renderAttr)}</div>
        </details>
      ) : null}

      {attrs.length > 0 ? (
        <button type="button" className={btnSecondary} disabled={saving} onClick={() => void save()}>
          {saving ? "Kaydediliyor…" : "Bu ürünün özelliklerini kaydet"}
        </button>
      ) : null}

      {msg ? <p className="text-xs text-zinc-700">{msg}</p> : null}
    </div>
  );
}
