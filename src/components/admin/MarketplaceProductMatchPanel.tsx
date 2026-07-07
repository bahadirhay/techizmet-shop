"use client";

import { useEffect, useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";

type ReadinessCheck = { key: string; label: string; ok: boolean; detail: string; optional?: boolean };

type CategoryOption = { id: string; label: string };

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
  attributeValueId?: number | null;
  customValue?: string | null;
};

type ProductRow = {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  stockQty: number;
  searchText: string;
  overrides: Override[];
  listingStatus: string;
  lastError: string | null;
};

type CellValue = { valueId: string; custom: string };

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  none: { text: "gönderilmedi", cls: "text-zinc-400" },
  pending: { text: "onay bekliyor", cls: "text-amber-600" },
  active: { text: "yayında", cls: "text-green-600" },
  inactive: { text: "pasif", cls: "text-zinc-500" },
  rejected: { text: "reddedildi", cls: "text-red-600" },
  exported: { text: "gönderildi", cls: "text-blue-600" },
};

function autoSuggest(attr: Attr, searchText: string): string {
  let best = "";
  let bestLen = 0;
  for (const v of attr.values) {
    const n = v.name.toLocaleLowerCase("tr").trim();
    if (n.length >= 2 && searchText.includes(n) && n.length > bestLen) {
      best = String(v.id);
      bestLen = n.length;
    }
  }
  return best;
}

export function MarketplaceProductMatchPanel({
  platform,
  categories,
  tablesReady = true,
}: {
  platform: string;
  categories: CategoryOption[];
  tablesReady?: boolean;
}) {
  const [localCategoryId, setLocalCategoryId] = useState("");
  const [trCatId, setTrCatId] = useState("");
  const [attrs, setAttrs] = useState<Attr[]>([]);
  const [template, setTemplate] = useState<Record<number, string>>({});
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [cells, setCells] = useState<Record<string, Record<number, CellValue>>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [checks, setChecks] = useState<ReadinessCheck[] | null>(null);
  const [ready, setReady] = useState(true);

  const perProductAttrs = attrs.filter((a) => showAll || !(a.attributeId in template));

  async function loadReadiness() {
    if (platform !== "trendyol") return;
    try {
      const res = await fetch("/api/admin/integrations/marketplaces/trendyol/readiness");
      if (!res.ok) return;
      const j = (await res.json()) as { ready?: boolean; checks?: ReadinessCheck[] };
      setChecks(j.checks ?? null);
      setReady(j.ready ?? true);
    } catch {
      /* readiness kontrol edilemedi */
    }
  }

  useEffect(() => {
    void loadReadiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initCells(rows: ProductRow[], attributes: Attr[], autofill: boolean) {
    const next: Record<string, Record<number, CellValue>> = {};
    for (const p of rows) {
      const row: Record<number, CellValue> = {};
      const savedById = new Map(p.overrides.map((o) => [o.attributeId, o]));
      for (const a of attributes) {
        const saved = savedById.get(a.attributeId);
        if (saved) {
          row[a.attributeId] = {
            valueId: saved.attributeValueId != null ? String(saved.attributeValueId) : "",
            custom: saved.customValue ?? "",
          };
        } else if (autofill) {
          row[a.attributeId] = { valueId: autoSuggest(a, p.searchText), custom: "" };
        } else {
          row[a.attributeId] = { valueId: "", custom: "" };
        }
      }
      next[p.id] = row;
    }
    setCells(next);
  }

  async function loadCategory() {
    if (!localCategoryId) {
      setMsg("Önce yerel kategori seçin");
      return;
    }
    setBusy(true);
    setMsg(null);
    setLoaded(false);

    const mapRes = await fetch(
      "/api/admin/integrations/marketplaces/mappings/categories?platform=trendyol",
    );
    const mapJson = (await mapRes.json()) as {
      mappings?: { categoryId: string | null; platformCategoryId: string }[];
    };
    const mappings = mapJson.mappings ?? [];
    const platformCatId =
      mappings.find((m) => m.categoryId === localCategoryId)?.platformCategoryId ??
      mappings.find((m) => m.categoryId === null)?.platformCategoryId ??
      "";
    setTrCatId(platformCatId);

    if (!platformCatId) {
      setAttrs([]);
      setProducts([]);
      setBusy(false);
      setLoaded(true);
      return;
    }

    const [attrRes, prodRes] = await Promise.all([
      fetch(`/api/admin/integrations/marketplaces/trendyol/category-attributes?categoryId=${platformCatId}`),
      fetch(`/api/admin/integrations/marketplaces/trendyol/products?categoryId=${localCategoryId}`),
    ]);
    const attrJson = (await attrRes.json()) as { attributes?: Attr[]; error?: string };
    const prodJson = (await prodRes.json()) as { products?: ProductRow[]; error?: string };
    if (!attrRes.ok) {
      setMsg(attrJson.error ?? "Özellikler alınamadı");
      setBusy(false);
      setLoaded(true);
      return;
    }
    const attributes = attrJson.attributes ?? [];
    const rows = prodJson.products ?? [];
    setAttrs(attributes);
    setProducts(rows);
    setSelected(new Set());

    // Kategori seviyesi şablon (sabitler)
    const tpl: Record<number, string> = {};
    for (const cat of [null, localCategoryId]) {
      const q = new URLSearchParams({ platform: "trendyol" });
      if (cat) q.set("categoryId", cat);
      const r = await fetch(`/api/admin/integrations/marketplaces/mappings/attributes?${q}`);
      if (!r.ok) continue;
      const j = (await r.json()) as {
        mappings?: { attributeId: number; attributeValueName: string | null; customValue: string | null }[];
      };
      for (const m of j.mappings ?? []) {
        const v = m.attributeValueName ?? m.customValue;
        if (v) tpl[m.attributeId] = v;
      }
    }
    setTemplate(tpl);
    initCells(rows, attributes, true);
    setBusy(false);
    setLoaded(true);
    setMsg(`${rows.length} ürün · ${attributes.length} özellik yüklendi (öneriler dolduruldu)`);
  }

  function setCell(productId: string, attributeId: number, patch: Partial<CellValue>) {
    setCells((prev) => {
      const base = prev[productId]?.[attributeId] ?? { valueId: "", custom: "" };
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          [attributeId]: { ...base, ...patch },
        },
      };
    });
  }

  function autoFillAll() {
    for (const p of products) {
      for (const a of perProductAttrs) {
        const cur = cells[p.id]?.[a.attributeId];
        if (cur?.valueId || cur?.custom) continue;
        const sug = autoSuggest(a, p.searchText);
        if (sug) setCell(p.id, a.attributeId, { valueId: sug, custom: "" });
      }
    }
    setMsg("Boş hücreler otomatik önerilerle dolduruldu");
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
    setSelected((prev) => (prev.size === visibleProducts.length ? new Set() : new Set(visibleProducts.map((p) => p.id))));
  }

  function collectAttributes(productId: string): Override[] {
    const row = cells[productId] ?? {};
    const out: Override[] = [];
    for (const a of attrs) {
      const c = row[a.attributeId];
      if (!c) continue;
      if (c.valueId) {
        out.push({ attributeId: a.attributeId, attributeValueId: Number(c.valueId) });
      } else if (c.custom.trim()) {
        out.push({ attributeId: a.attributeId, customValue: c.custom.trim() });
      }
    }
    return out;
  }

  async function saveAttributes(ids: string[]): Promise<boolean> {
    const items = ids.map((id) => ({ productId: id, attributes: collectAttributes(id) }));
    const res = await fetch("/api/admin/integrations/marketplaces/trendyol/product-attributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setMsg(j.error ?? "Kaydedilemedi");
      return false;
    }
    return true;
  }

  async function saveSelected() {
    const ids = selected.size ? [...selected] : products.map((p) => p.id);
    setSending(true);
    setMsg(null);
    const ok = await saveAttributes(ids);
    setSending(false);
    if (ok) setMsg(`${ids.length} ürünün özellikleri kaydedildi`);
  }

  async function refreshBatchStatus() {
    setSending(true);
    setMsg(null);
    const res = await fetch("/api/admin/integrations/marketplaces/trendyol/batch-status", {
      method: "POST",
    });
    const json = (await res.json()) as { message?: string; error?: string };
    setSending(false);
    if (!res.ok) {
      setMsg(json.error ?? "Durum alınamadı");
      return;
    }
    setMsg(`Trendyol durumu: ${json.message ?? "güncellendi"}`);
    await loadCategory();
  }

  async function sendSelected() {
    const ids = [...selected];
    if (ids.length === 0) {
      setMsg("Gönderilecek ürün seçin");
      return;
    }
    setSending(true);
    setMsg(null);
    const saved = await saveAttributes(ids);
    if (!saved) {
      setSending(false);
      return;
    }
    const res = await fetch("/api/admin/integrations/marketplaces/trendyol/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: ids }),
    });
    const json = (await res.json()) as { result?: { ok: boolean; message: string }; error?: string };
    setSending(false);
    if (!res.ok) {
      setMsg(json.error ?? "Gönderim başarısız");
      return;
    }
    setMsg(json.result?.message ?? "Gönderildi");
    await loadCategory();
    await loadReadiness();
  }

  const visibleProducts = products.filter((p) =>
    search.trim() ? p.searchText.includes(search.trim().toLocaleLowerCase("tr")) : true,
  );

  if (platform !== "trendyol") {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
        Ürün eşleştirme şu an Trendyol için aktif. Diğer platformlar sırayla eklenecek.
      </p>
    );
  }

  const failedChecks = checks?.filter((c) => !c.ok && !c.optional) ?? [];

  return (
    <div className="space-y-4">
      {checks ? (
        <div
          className={`rounded-lg border p-4 ${
            ready ? "border-green-200 bg-green-50" : "border-amber-300 bg-amber-50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {ready
                ? "Gönderime hazır — tüm ayarlar tamam"
                : `Gönderim öncesi ${failedChecks.length} eksik var`}
            </p>
            <button
              type="button"
              className="text-xs text-zinc-500 underline"
              onClick={() => void loadReadiness()}
            >
              Yenile
            </button>
          </div>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {checks.map((c) => {
              const mark = c.ok ? "✓" : c.optional ? "○" : "✗";
              const markCls = c.ok ? "text-green-600" : c.optional ? "text-zinc-400" : "text-amber-600";
              return (
                <li key={c.key} className="flex items-start gap-2 text-xs">
                  <span className={markCls}>{mark}</span>
                  <span>
                    <span className="font-medium">{c.label}</span>
                    <span className="text-zinc-500"> — {c.detail}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          {!ready ? (
            <p className="mt-2 text-xs text-amber-900">
              Eksikleri <strong>Entegrasyon ayarları</strong> sekmesinden tamamlayın, sonra “Yenile”ye basın.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm font-semibold">Ürün eşleştirme & gönderim</p>
        <p className="mt-1 text-xs text-zinc-500">
          Kategori seç → ürünler listelenir. Aroma/gramaj gibi değişkenler <strong>otomatik önerilir</strong>
          (başlık, varyant, SKU, açıklamaya göre); onayla, seç ve gönder. Sabitler kategori şablonundan gelir.
        </p>
        {!tablesReady ? (
          <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Pazaryeri tabloları için Prisma client güncellenmeli (deploy sonrası hazır olur).
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[16rem] flex-1">
            <AdminField label="Kategori">
              <select
                className={inputClass}
                value={localCategoryId}
                onChange={(e) => setLocalCategoryId(e.target.value)}
              >
                <option value="">Kategori seçin…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>
          <button type="button" className={btnPrimary} disabled={busy} onClick={() => void loadCategory()}>
            {busy ? "Yükleniyor…" : "Ürünleri getir"}
          </button>
        </div>
        {loaded && !trCatId ? (
          <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Bu kategori için Trendyol kategori eşlemesi yok. Önce yukarıdaki <strong>Kategori eşlemesi</strong>{" "}
            bölümünden eşleyin.
          </p>
        ) : null}
      </div>

      {trCatId && products.length > 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <input
              className={`${inputClass} max-w-[16rem]`}
              placeholder="Ürün ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" className={btnSecondary} onClick={autoFillAll}>
              Otomatik doldur
            </button>
            <label className="flex items-center gap-1 text-xs text-zinc-600">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
              Tüm özellikler
            </label>
            <div className="ml-auto flex gap-2">
              <button type="button" className={btnSecondary} disabled={sending} onClick={() => void refreshBatchStatus()}>
                {sending ? "…" : "Trendyol durumunu yenile"}
              </button>
              <button type="button" className={btnSecondary} disabled={sending} onClick={() => void saveSelected()}>
                {sending ? "…" : selected.size ? `Seçiliyi kaydet (${selected.size})` : "Tümünü kaydet"}
              </button>
              <button type="button" className={btnPrimary} disabled={sending || selected.size === 0} onClick={() => void sendSelected()}>
                {sending ? "Gönderiliyor…" : `Seçiliyi gönder (${selected.size})`}
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
                  {perProductAttrs.map((a) => (
                    <th key={a.attributeId} className="p-2 text-left">
                      {a.attributeName}
                      {a.required ? <span className="text-red-600"> *</span> : null}
                    </th>
                  ))}
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
                          <div className="min-w-[10rem]">
                            <p className="font-medium leading-tight">{p.title}</p>
                            <p className="text-xs text-zinc-500">
                              {p.barcode ? (
                                `Barkod: ${p.barcode}`
                              ) : (
                                <span className="text-red-600">Barkod yok — gönderilemez</span>
                              )}{" "}
                              · stok {p.stockQty}
                            </p>
                          </div>
                        </div>
                      </td>
                      {perProductAttrs.map((a) => {
                        const c = cells[p.id]?.[a.attributeId] ?? { valueId: "", custom: "" };
                        const tpl = template[a.attributeId];
                        return (
                          <td key={a.attributeId} className="p-2">
                            {a.values.length > 0 ? (
                              <select
                                className={`${inputClass} min-w-[8rem] text-xs`}
                                value={c.valueId}
                                onChange={(e) =>
                                  setCell(p.id, a.attributeId, { valueId: e.target.value, custom: "" })
                                }
                              >
                                <option value="">{tpl ? `Şablon (${tpl})` : "—"}</option>
                                {a.values.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.name}
                                  </option>
                                ))}
                              </select>
                            ) : a.allowCustom ? (
                              <input
                                className={`${inputClass} min-w-[8rem] text-xs`}
                                value={c.custom}
                                onChange={(e) =>
                                  setCell(p.id, a.attributeId, { valueId: "", custom: e.target.value })
                                }
                              />
                            ) : (
                              <span className="text-xs text-zinc-400">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2">
                        <span className={`text-xs ${status.cls}`}>{status.text}</span>
                        {p.lastError ? (
                          <p className="mt-0.5 max-w-[12rem] text-[11px] text-red-600">{p.lastError}</p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {loaded && trCatId && products.length === 0 && !busy ? (
        <p className="text-sm text-zinc-500">Bu kategoride yayında ürün bulunamadı.</p>
      ) : null}

      {msg ? <p className="text-sm text-zinc-700">{msg}</p> : null}
    </div>
  );
}
