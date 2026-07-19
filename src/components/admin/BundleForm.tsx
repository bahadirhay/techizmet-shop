"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { ProductMediaEditor } from "@/components/admin/ProductMediaEditor";
import type { ProductMediaItem } from "@/lib/product-media";
import { primaryProductImageUrl } from "@/lib/product-media";
import { PRODUCT_BADGE_PRESETS, type ProductBadgeId } from "@/lib/product-badges";
import { discountPercent } from "@/lib/product-discount";
import { ProductSeoHealthPanel } from "@/components/admin/ProductSeoHealthPanel";
import { ProductSeoOptimizer } from "@/components/admin/ProductSeoOptimizer";
import { ProductProfitEstimate } from "@/components/admin/ProductProfitEstimate";
import { VatRateSelect } from "@/components/admin/VatRateSelect";
import { ProductMarketplacePrices } from "@/components/admin/ProductMarketplacePrices";
import { buildQuickSeoDefaults } from "@/lib/admin/product-seo/content-builders";
import { htmlToPlainText } from "@/lib/product-content-format";
import type { ActiveMarketplaceOption } from "@/lib/marketplace/product-prices";
import { computeAvailableBundles } from "@/lib/product-bundle";

type Opt = { id: string; title: string };

export type BundleComponentRow = {
  productId: string;
  variantId: string | null;
  qtyPerBundle: number;
  title: string;
  stockQty?: number;
};

export type BundleFormData = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  descriptionHtml: string;
  keyFeaturesHtml: string;
  howToUseHtml: string;
  sku: string;
  barcode: string;
  collectionId: string;
  categoryId: string;
  categoryIds: string[];
  brandId: string;
  price: string;
  compareAt: string;
  cost: string;
  vatRate: number;
  marketplacePrices: Record<string, string>;
  marketplaceMarkups: Record<string, string>;
  lowStockThreshold: string;
  weightGrams: string;
  pieceCount: string;
  desi: string;
  seoTitle: string;
  seoDescription: string;
  imageUrl: string;
  mediaItems: ProductMediaItem[];
  badges: ProductBadgeId[];
  published: boolean;
  /** false = web sitesinde gizle; pazaryeri sync published ile devam eder */
  storeVisible: boolean;
  components: BundleComponentRow[];
  computedStockQty: number;
};

type PickerProduct = {
  id: string;
  title: string;
  slug: string;
  sku: string | null;
  stockQty: number;
  imageUrl: string | null;
  variants: { id: string; label: string; stockQty: number; isDefault: boolean }[];
};

export function BundleForm({
  initial,
  collections,
  categories,
  brands,
  activeMarketplaces = [],
  defaultAutoGenerateBarcode = false,
  homepageMode = "mirror",
  siteUrl = "",
  siteName = "Mağaza",
  webShippingCostMinor = 0,
  packagingCostMinor = 0,
  cardFeePercent = 2.4,
  freeShippingOverMinor = 0,
}: {
  initial: BundleFormData;
  collections: Opt[];
  categories: Opt[];
  brands: Opt[];
  activeMarketplaces?: ActiveMarketplaceOption[];
  defaultAutoGenerateBarcode?: boolean;
  homepageMode?: "mirror" | "blocks";
  siteUrl?: string;
  siteName?: string;
  webShippingCostMinor?: number;
  packagingCostMinor?: number;
  cardFeePercent?: number;
  freeShippingOverMinor?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [autoGenerateBarcode, setAutoGenerateBarcode] = useState(defaultAutoGenerateBarcode);
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [mediaItems, setMediaItems] = useState<ProductMediaItem[]>(() => [...initial.mediaItems]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pickerQ, setPickerQ] = useState("");
  const [pickerResults, setPickerResults] = useState<PickerProduct[]>([]);
  const [pickerBusy, setPickerBusy] = useState(false);

  const galleryKey = `${initial.id ?? "new"}-${initial.mediaItems.map((m) => `${m.mediaType}:${m.url}`).join("|")}`;

  useEffect(() => {
    setForm(initial);
    setMediaItems([...initial.mediaItems]);
    setErr(null);
  }, [galleryKey]);

  useEffect(() => {
    if (!form.title.trim()) return;
    if (form.seoTitle.trim() && form.seoDescription.trim()) return;
    const brandTitle = brands.find((b) => b.id === form.brandId)?.title;
    const categoryTitles = form.categoryIds
      .map((id) => categories.find((c) => c.id === id)?.title)
      .filter(Boolean) as string[];
    const defaults = buildQuickSeoDefaults({
      title: form.title,
      brandTitle,
      siteName,
      categoryTitles,
      description: form.description || form.descriptionHtml,
    });
    setForm((f) => {
      if (f.seoTitle.trim() && f.seoDescription.trim()) return f;
      return {
        ...f,
        seoTitle: f.seoTitle.trim() ? f.seoTitle : defaults.seoTitle,
        seoDescription: f.seoDescription.trim() ? f.seoDescription : defaults.seoDescription,
      };
    });
  }, [form.title, form.brandId, form.categoryIds.join("|"), siteName]);

  const liveStock = useMemo(() => {
    const rows = form.components.map((c) => ({
      stockQty: c.stockQty ?? 0,
      qtyPerBundle: c.qtyPerBundle,
    }));
    return computeAvailableBundles(rows);
  }, [form.components]);

  function set<K extends keyof BundleFormData>(key: K, val: BundleFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function setCategoryIds(nextIds: string[]) {
    const unique = [...new Set(nextIds)];
    setForm((current) => ({
      ...current,
      categoryIds: unique,
      categoryId: unique.includes(current.categoryId) ? current.categoryId : (unique[0] ?? ""),
    }));
  }

  async function generateBarcode() {
    setBarcodeBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/products/generate-barcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excludeProductId: form.id }),
    });
    const json = (await res.json()) as { barcode?: string; error?: string };
    setBarcodeBusy(false);
    if (!res.ok || !json.barcode) {
      setErr(json.error ?? "Barkod üretilemedi");
      return;
    }
    set("barcode", json.barcode);
  }

  async function searchComponents() {
    setPickerBusy(true);
    const params = new URLSearchParams();
    if (pickerQ.trim()) params.set("q", pickerQ.trim());
    if (form.id) params.set("excludeId", form.id);
    const res = await fetch(`/api/admin/bundles/component-options?${params}`);
    const json = (await res.json()) as { products?: PickerProduct[] };
    setPickerResults(json.products ?? []);
    setPickerBusy(false);
  }

  useEffect(() => {
    const t = setTimeout(() => void searchComponents(), 250);
    return () => clearTimeout(t);
  }, [pickerQ, form.id]);

  function addComponent(product: PickerProduct) {
    if (form.components.some((c) => c.productId === product.id)) {
      setErr("Bu ürün zaten pakette");
      return;
    }
    const variant =
      product.variants.length > 0
        ? (product.variants.find((v) => v.isDefault) ?? product.variants[0])
        : null;
    const stockQty = variant ? variant.stockQty : product.stockQty;
    const title = variant ? `${product.title} — ${variant.label}` : product.title;
    setForm((f) => ({
      ...f,
      components: [
        ...f.components,
        {
          productId: product.id,
          variantId: variant?.id ?? null,
          qtyPerBundle: 1,
          title,
          stockQty,
        },
      ],
    }));
    setErr(null);
  }

  function updateComponent(index: number, patch: Partial<BundleComponentRow>) {
    setForm((f) => ({
      ...f,
      components: f.components.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function removeComponent(index: number) {
    setForm((f) => ({
      ...f,
      components: f.components.filter((_, i) => i !== index),
    }));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      if (!form.components.length) {
        setErr("En az bir bileşen ürün seçin");
        return;
      }
      const items = mediaItems.filter((m) => m.url.trim());
      const categoryIds = [...new Set(form.categoryIds.filter(Boolean))];
      const categoryId = categoryIds.includes(form.categoryId)
        ? form.categoryId
        : (categoryIds[0] ?? "");
      const payload = {
        ...form,
        categoryIds,
        categoryId,
        autoGenerateBarcode,
        imageUrl: primaryProductImageUrl(items) ?? "",
        mediaItems: items,
        components: form.components.map((c) => ({
          productId: c.productId,
          variantId: c.variantId,
          qtyPerBundle: c.qtyPerBundle,
        })),
      };
      const url = form.id ? `/api/admin/bundles/${form.id}` : "/api/admin/bundles";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      let json: { error?: string } = {};
      if (raw.trim()) {
        try {
          json = JSON.parse(raw) as { error?: string };
        } catch {
          json = {};
        }
      }
      if (!res.ok) {
        setErr(json.error ?? `Kayıt başarısız (${res.status})`);
        return;
      }
      router.push("/admin/products");
      router.refresh();
    } catch {
      setErr("Bağlantı hatası — tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{form.id ? "Paket düzenle" : "Yeni paket"}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Bileşen stoklarından otomatik hesaplanan paket satışı — pazaryeri ve SEO normal ürün gibi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.slug ? (
            <Link
              href={`/products/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={btnSecondary}
            >
              Vitrini aç
            </Link>
          ) : null}
          <button type="button" className={btnSecondary} onClick={() => router.back()}>
            Geri
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-medium">Paket içeriği</h2>
        <p className="text-sm text-zinc-600">
          Satılabilir adet:{" "}
          <strong className="text-zinc-900">{liveStock}</strong>
          {form.id && form.computedStockQty !== liveStock ? (
            <span className="ml-2 text-xs text-amber-700">(kayıtlı: {form.computedStockQty})</span>
          ) : null}
        </p>

        {form.components.map((row, index) => (
          <div
            key={`${row.productId}-${row.variantId ?? "x"}-${index}`}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
          >
            <div className="min-w-[12rem] flex-1">
              <p className="text-sm font-medium text-zinc-900">{row.title}</p>
              {row.stockQty != null ? (
                <p className="text-xs text-zinc-500">Stok: {row.stockQty}</p>
              ) : null}
            </div>
            <AdminField label="Adet / paket">
              <input
                className={`${inputClass} w-24`}
                type="number"
                min={1}
                value={row.qtyPerBundle}
                onChange={(e) =>
                  updateComponent(index, {
                    qtyPerBundle: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
              />
            </AdminField>
            <button type="button" className={btnSecondary} onClick={() => removeComponent(index)}>
              Kaldır
            </button>
          </div>
        ))}

        <AdminField label="Ürün ekle" hint="Arama yapın ve listeden seçin">
          <input
            className={inputClass}
            value={pickerQ}
            onChange={(e) => setPickerQ(e.target.value)}
            placeholder="Ürün adı, SKU veya slug"
          />
        </AdminField>
        {pickerBusy ? <p className="text-sm text-zinc-500">Aranıyor…</p> : null}
        {pickerResults.length > 0 ? (
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
            {pickerResults.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-100"
                  onClick={() => addComponent(p)}
                >
                  <span>{p.title}</span>
                  <span className="text-xs text-zinc-500">
                    stok {p.variants.length ? p.variants.reduce((s, v) => s + v.stockQty, 0) : p.stockQty}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-4 rounded-xl border bg-white p-6">
        <AdminField label="Paket adı *">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            required
          />
        </AdminField>
        <AdminField label="URL slug" hint="Boş bırakılırsa başlıktan üretilir">
          <input className={inputClass} value={form.slug} onChange={(e) => set("slug", e.target.value)} />
        </AdminField>

        <div className="grid gap-4 sm:grid-cols-4">
          <AdminField label="SKU">
            <input className={inputClass} value={form.sku} onChange={(e) => set("sku", e.target.value)} />
          </AdminField>
          <AdminField label="Ağırlık (g)" hint="SEO ve kargo için">
            <input
              className={inputClass}
              type="number"
              min={0}
              value={form.weightGrams}
              onChange={(e) => set("weightGrams", e.target.value)}
            />
          </AdminField>
          <AdminField label="Adet / Paket" hint="Başlıkta adet yoksa vitrinde eklenir">
            <input
              className={inputClass}
              type="number"
              min={0}
              value={form.pieceCount}
              onChange={(e) => set("pieceCount", e.target.value)}
            />
          </AdminField>
          <AdminField label="Barkod">
            <div className="flex flex-wrap gap-2">
              <input
                className={`${inputClass} min-w-[12rem] flex-1`}
                value={form.barcode}
                onChange={(e) => set("barcode", e.target.value)}
              />
              <button
                type="button"
                className={btnSecondary}
                disabled={barcodeBusy}
                onClick={() => void generateBarcode()}
              >
                {barcodeBusy ? "…" : "Üret"}
              </button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={autoGenerateBarcode}
                onChange={(e) => setAutoGenerateBarcode(e.target.checked)}
              />
              Barkod boşsa kayıtta otomatik oluştur
            </label>
          </AdminField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <AdminField label="Satış fiyatı (TL) *">
            <input
              className={inputClass}
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </AdminField>
          <AdminField label="Liste fiyatı (TL)">
            <input
              className={inputClass}
              type="number"
              step="0.01"
              value={form.compareAt}
              onChange={(e) => set("compareAt", e.target.value)}
            />
            {form.compareAt && form.price ? (
              (() => {
                const sale = parseFloat(form.price.replace(",", "."));
                const list = parseFloat(form.compareAt.replace(",", "."));
                if (list > sale && sale > 0) {
                  const pct = discountPercent(Math.round(list * 100), Math.round(sale * 100));
                  return pct ? (
                    <p className="mt-1 text-xs text-red-600">Vitrinde: %{pct} İNDİRİM rozeti</p>
                  ) : null;
                }
                return null;
              })()
            ) : null}
          </AdminField>
          <AdminField label="Maliyet (TL)">
            <input
              className={inputClass}
              type="number"
              step="0.01"
              value={form.cost}
              onChange={(e) => set("cost", e.target.value)}
            />
          </AdminField>
        </div>

        <ProductProfitEstimate
          price={form.price}
          cost={form.cost}
          webShippingCostMinor={webShippingCostMinor}
          packagingCostMinor={packagingCostMinor}
          cardFeePercent={cardFeePercent}
          freeShippingOverMinor={freeShippingOverMinor}
        />

        <AdminField label="KDV oranı">
          <VatRateSelect value={form.vatRate} onChange={(vatRate) => set("vatRate", vatRate)} />
        </AdminField>

        <ProductMarketplacePrices
          webPrice={form.price}
          cost={form.cost}
          categoryId={form.categoryId}
          platforms={activeMarketplaces}
          prices={form.marketplacePrices}
          markups={form.marketplaceMarkups}
          onChange={(platform, value) =>
            set("marketplacePrices", { ...form.marketplacePrices, [platform]: value })
          }
          onMarkupChange={(platform, value) =>
            set("marketplaceMarkups", { ...form.marketplaceMarkups, [platform]: value })
          }
          title={form.title}
          brandName={brands.find((b) => b.id === form.brandId)?.title ?? ""}
          weightGrams={parseFloat(form.weightGrams) > 0 ? parseFloat(form.weightGrams) : undefined}
          pieceCount={parseInt(form.pieceCount) > 0 ? parseInt(form.pieceCount) : undefined}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Kritik stok uyarısı">
            <input
              className={inputClass}
              type="number"
              value={form.lowStockThreshold}
              onChange={(e) => set("lowStockThreshold", e.target.value)}
            />
          </AdminField>
          <AdminField label="Desi">
            <input
              className={inputClass}
              type="number"
              step="0.01"
              value={form.desi}
              onChange={(e) => set("desi", e.target.value)}
            />
          </AdminField>
        </div>

        <AdminField label="Kısa açıklama">
          <textarea
            className={inputClass}
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </AdminField>

        <ProductMediaEditor items={mediaItems} onChange={setMediaItems} />

        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Koleksiyon">
            <select
              className={inputClass}
              value={form.collectionId}
              onChange={(e) => set("collectionId", e.target.value)}
            >
              <option value="">—</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Marka">
            <select
              className={inputClass}
              value={form.brandId}
              onChange={(e) => set("brandId", e.target.value)}
            >
              <option value="">—</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </AdminField>
        </div>

        <AdminField label="Kategoriler">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const checked = form.categoryIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${checked ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => {
                      setCategoryIds(
                        checked
                          ? form.categoryIds.filter((id) => id !== c.id)
                          : [...form.categoryIds, c.id],
                      );
                    }}
                  />
                  {c.title}
                </label>
              );
            })}
          </div>
        </AdminField>

        <AdminField label="Rozetler">
          <div className="flex flex-wrap gap-2">
            {PRODUCT_BADGE_PRESETS.map((b) => {
              const checked = form.badges.includes(b.id);
              return (
                <label
                  key={b.id}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${checked ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() =>
                      set(
                        "badges",
                        checked ? form.badges.filter((x) => x !== b.id) : [...form.badges, b.id],
                      )
                    }
                  />
                  {b.label}
                </label>
              );
            })}
          </div>
        </AdminField>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => set("published", e.target.checked)}
          />
          Yayında (pazaryeri + site için ana anahtar)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.storeVisible}
            onChange={(e) => set("storeVisible", e.target.checked)}
            disabled={!form.published}
          />
          Web sitesinde göster
        </label>
        <p className="-mt-2 text-xs text-zinc-500">
          İşareti kaldırınca ürün sitede gizlenir; yayındaysa pazaryerine gönderilmeye devam eder.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border bg-white p-6">
        <AdminField label="SEO başlık">
          <input
            className={inputClass}
            value={form.seoTitle}
            onChange={(e) => set("seoTitle", e.target.value)}
          />
        </AdminField>
        <AdminField label="SEO açıklama">
          <textarea
            className={inputClass}
            rows={3}
            value={form.seoDescription}
            onChange={(e) => set("seoDescription", e.target.value)}
          />
        </AdminField>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 space-y-4">
          <p className="text-sm font-semibold text-zinc-800">Ürün sayfası içeriği (vitrin accordion)</p>
          <p className="-mt-2 text-xs text-zinc-500">
            Google ve pazaryeri için tanıtım, özellikler/besin değerleri (Key Features) ve kullanım
            talimatları. Aşağıdaki «Tam SEO çalışması» bu alanları otomatik doldurur — düz metin yazın.
          </p>
          <AdminField label="Description — ürün tanıtımı">
            <textarea
              className={inputClass}
              rows={5}
              value={form.descriptionHtml}
              onChange={(e) => set("descriptionHtml", e.target.value)}
              placeholder="Detaylı tanıtım: paket içeriği, faydalar, hedef kitle"
            />
          </AdminField>
          <AdminField label="Key Features — özellikler & besin değerleri">
            <textarea
              className={inputClass}
              rows={12}
              value={form.keyFeaturesHtml}
              onChange={(e) => set("keyFeaturesHtml", e.target.value)}
              placeholder="İçerik listesi, protein/yağ/lif/nem/kül (%), katkısız vurgusu…"
            />
          </AdminField>
          <AdminField label="How to Use — kullanım / veriliş">
            <textarea
              className={inputClass}
              rows={8}
              value={form.howToUseHtml}
              onChange={(e) => set("howToUseHtml", e.target.value)}
              placeholder="Günlük miktar, saklama, yaş grubu uyarıları"
            />
          </AdminField>
        </div>
      </div>

      <ProductSeoHealthPanel
        title={form.title}
        slug={form.slug}
        seoTitle={form.seoTitle}
        seoDescription={form.seoDescription}
        description={form.description}
        descriptionHtml={form.descriptionHtml}
          keyFeaturesHtml={form.keyFeaturesHtml}
          howToUseHtml={form.howToUseHtml}
        brandId={form.brandId}
        categoryId={form.categoryId}
        imageUrl={form.imageUrl || primaryProductImageUrl(mediaItems) || ""}
        barcode={form.barcode}
        published={form.published}
        homepageMode={homepageMode}
        siteUrl={siteUrl}
        onFillMeta={() => {
          const brandTitle = brands.find((b) => b.id === form.brandId)?.title;
          const categoryTitles = form.categoryIds
            .map((id) => categories.find((c) => c.id === id)?.title)
            .filter(Boolean) as string[];
          const defaults = buildQuickSeoDefaults({
            title: form.title,
            brandTitle,
            siteName,
            categoryTitles,
            description: form.description || form.descriptionHtml,
          });
          setForm((f) => ({
            ...f,
            seoTitle: f.seoTitle.trim() ? f.seoTitle : defaults.seoTitle,
            seoDescription: f.seoDescription.trim()
              ? f.seoDescription
              : defaults.seoDescription,
          }));
        }}
      />

      <ProductSeoOptimizer
        title={form.title}
        slug={form.slug}
        description={form.description || form.descriptionHtml}
        categoryIds={form.categoryIds}
        categoryId={form.categoryId}
        brandId={form.brandId}
        productId={form.id}
        weightGrams={parseFloat(form.weightGrams) > 0 ? parseFloat(form.weightGrams) : undefined}
        pieceCount={parseInt(form.pieceCount) > 0 ? parseInt(form.pieceCount) : undefined}
        onApply={(patch) => {
          if (patch.title != null) set("title", patch.title);
          if (patch.slug != null) set("slug", patch.slug);
          if (patch.seoTitle != null) set("seoTitle", patch.seoTitle);
          if (patch.seoDescription != null) set("seoDescription", patch.seoDescription);
          if (patch.description != null) set("description", patch.description);
          if (patch.descriptionHtml != null) {
            set("descriptionHtml", htmlToPlainText(patch.descriptionHtml) || patch.descriptionHtml);
          }
          if (patch.keyFeaturesHtml != null) {
            set("keyFeaturesHtml", htmlToPlainText(patch.keyFeaturesHtml) || patch.keyFeaturesHtml);
          }
          if (patch.howToUseHtml != null) {
            set("howToUseHtml", htmlToPlainText(patch.howToUseHtml) || patch.howToUseHtml);
          }
        }}
      />

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button type="button" className={btnSecondary} onClick={() => router.push("/admin/products")}>
          İptal
        </button>
      </div>
    </div>
  );
}
