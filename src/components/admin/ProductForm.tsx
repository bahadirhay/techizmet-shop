"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { ProductMediaEditor } from "@/components/admin/ProductMediaEditor";
import { minorToTry } from "@/lib/admin/money";
import type { ProductMediaItem } from "@/lib/product-media";
import { primaryProductImageUrl } from "@/lib/product-media";
import { PRODUCT_BADGE_PRESETS, type ProductBadgeId } from "@/lib/product-badges";
import { discountPercent } from "@/lib/product-discount";
import { emptyVariantRow } from "@/lib/admin/product-variants";
import type { VariantFormRow } from "@/lib/product-variants";
import { ProductExploreEditor } from "@/components/admin/ProductExploreEditor";
import { ProductSeoOptimizer } from "@/components/admin/ProductSeoOptimizer";
import { VatRateSelect } from "@/components/admin/VatRateSelect";
import { ProductMarketplacePrices } from "@/components/admin/ProductMarketplacePrices";
import { DEFAULT_TR_VAT_RATE } from "@/lib/tr-vat-rates";
import type { ActiveMarketplaceOption } from "@/lib/marketplace/product-prices";
import { serializeExploreLooks, type ProductExploreLook } from "@/lib/product-explore-looks";
import {
  PRODUCT_HIGHLIGHT_SLOTS,
  serializeProductHighlights,
  type ProductHighlight,
} from "@/lib/product-highlights";

type Opt = { id: string; title: string };
type ProductOpt = { slug: string; title: string };

export type ProductFormData = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  descriptionHtml: string;
  keyFeaturesHtml: string;
  howToUseHtml: string;
  highlights: ProductHighlight[];
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
  stockQty: string;
  lowStockThreshold: string;
  weightGrams: string;
  desi: string;
  seoTitle: string;
  seoDescription: string;
  imageUrl: string;
  imageUrls: string[];
  mediaItems: ProductMediaItem[];
  badges: ProductBadgeId[];
  variantOptionName: string;
  variants: VariantFormRow[];
  exploreLooks: ProductExploreLook[];
  useSiteDefaultExplore: boolean;
  published: boolean;
};

export function ProductForm({
  initial,
  collections,
  categories,
  brands,
  allProducts = [],
  siteDefaultExplore = [],
  activeMarketplaces = [],
  defaultAutoGenerateBarcode = false,
}: {
  initial: ProductFormData;
  collections: Opt[];
  categories: Opt[];
  brands: Opt[];
  allProducts?: ProductOpt[];
  siteDefaultExplore?: ProductExploreLook[];
  activeMarketplaces?: ActiveMarketplaceOption[];
  defaultAutoGenerateBarcode?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [autoGenerateBarcode, setAutoGenerateBarcode] = useState(defaultAutoGenerateBarcode);
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [mediaItems, setMediaItems] = useState<ProductMediaItem[]>(() => [...initial.mediaItems]);
  const [exploreLooks, setExploreLooks] = useState<ProductExploreLook[]>(() =>
    initial.useSiteDefaultExplore && siteDefaultExplore.length
      ? [...siteDefaultExplore]
      : [...initial.exploreLooks],
  );
  const [useSiteDefaultExplore, setUseSiteDefaultExplore] = useState(
    initial.useSiteDefaultExplore,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const galleryKey = `${initial.id ?? "new"}-${initial.mediaItems.map((m) => `${m.mediaType}:${m.url}`).join("|")}`;

  useEffect(() => {
    setForm(initial);
    setMediaItems([...initial.mediaItems]);
    setUseSiteDefaultExplore(initial.useSiteDefaultExplore);
    setExploreLooks(
      initial.useSiteDefaultExplore && siteDefaultExplore.length
        ? [...siteDefaultExplore]
        : [...initial.exploreLooks],
    );
    setErr(null);
  }, [galleryKey]);

  function set<K extends keyof ProductFormData>(key: K, val: ProductFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
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

  function setCategoryIds(nextIds: string[]) {
    const unique = [...new Set(nextIds)];
    setForm((current) => ({
      ...current,
      categoryIds: unique,
      categoryId: unique.includes(current.categoryId) ? current.categoryId : (unique[0] ?? ""),
    }));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const items = mediaItems.filter((m) => m.url.trim());
    const cleanedLooks = exploreLooks
      .filter((l) => l.imageUrl.trim())
      .map((l) => ({
        ...l,
        productSlugs: l.productSlugs.filter(Boolean),
      }));
    const payload = {
      ...form,
      autoGenerateBarcode,
      imageUrl: primaryProductImageUrl(items) ?? "",
      imageUrls: items.filter((m) => m.mediaType === "image").map((m) => m.url),
      mediaItems: items,
      useSiteDefaultExplore,
      exploreLooksJson: useSiteDefaultExplore
        ? null
        : serializeExploreLooks(cleanedLooks),
      highlightsJson: serializeProductHighlights(form.highlights),
    };
    const url = form.id ? `/api/admin/products/${form.id}` : "/api/admin/products";
    const method = form.id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { error?: string; product?: { id: string } };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Kayıt başarısız");
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{form.id ? "Ürün düzenle" : "Yeni ürün"}</h1>
          {form.slug ? (
            <p className="mt-1 text-sm text-zinc-600">
              <span className="font-medium text-zinc-800">{form.title || "—"}</span>
              {" · "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">{form.slug}</code>
            </p>
          ) : null}
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
        <AdminField label="Ürün adı *">
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
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="SKU">
            <input className={inputClass} value={form.sku} onChange={(e) => set("sku", e.target.value)} />
          </AdminField>
          <AdminField label="Barkod" hint="Pazaryeri eşleşmesi için EAN-13 önerilir">
            <div className="flex flex-wrap gap-2">
              <input
                className={`${inputClass} min-w-[12rem] flex-1`}
                value={form.barcode}
                onChange={(e) => set("barcode", e.target.value)}
                placeholder="8690123456789"
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
          <AdminField label="Satış fiyatı (TL) *" hint="Web sitesinde müşterinin ödediği fiyat (KDV dahil)">
            <input
              className={inputClass}
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </AdminField>
          <AdminField
            label="Liste fiyatı (TL)"
            hint="Üstü çizili eski fiyat — vitrinde otomatik % indirim rozeti"
          >
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
          <AdminField label="Maliyet (TL)" hint="Opsiyonel — net kâr raporları için; boş bırakılabilir">
            <input
              className={inputClass}
              type="number"
              step="0.01"
              value={form.cost}
              onChange={(e) => set("cost", e.target.value)}
            />
          </AdminField>
        </div>
        <AdminField label="KDV oranı" hint="Satış fiyatı KDV dahildir. Fatura ön izlemesi ve e-Arşiv kesiminde kullanılır.">
          <VatRateSelect value={form.vatRate} onChange={(vatRate) => set("vatRate", vatRate)} />
        </AdminField>

        <ProductMarketplacePrices
          webPrice={form.price}
          cost={form.cost}
          categoryId={form.categoryId}
          platforms={activeMarketplaces}
          prices={form.marketplacePrices}
          onChange={(platform, value) =>
            set("marketplacePrices", { ...form.marketplacePrices, [platform]: value })
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <AdminField label="Stok">
            <input
              className={inputClass}
              type="number"
              value={form.stockQty}
              onChange={(e) => set("stockQty", e.target.value)}
            />
          </AdminField>
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
              step="0.1"
              value={form.desi}
              onChange={(e) => set("desi", e.target.value)}
            />
          </AdminField>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
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
          <AdminField
            label="Ana kategori"
            hint={
              form.categoryIds.length
                ? "Vitrindeki ana kategori/breadcrumb için kullanılır."
                : "Önce aşağıdan en az bir kategori seçin."
            }
          >
            <select
              className={inputClass}
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              disabled={form.categoryIds.length === 0}
            >
              <option value="">—</option>
              {categories
                .filter((c) => form.categoryIds.includes(c.id))
                .map((c) => (
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
        <AdminField
          label="Ek kategoriler"
          hint="Ürün birden fazla kategoride görünebilir. Ana kategori seçili kategorilerden biri olmalıdır."
        >
          <select
            multiple
            size={Math.min(Math.max(categories.length, 4), 8)}
            className={`${inputClass} min-h-[10rem]`}
            value={form.categoryIds}
            onChange={(e) =>
              setCategoryIds(Array.from(e.currentTarget.selectedOptions, (option) => option.value))
            }
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          {form.categoryIds.length ? (
            <p className="mt-2 text-xs text-zinc-500">
              Seçili:{" "}
              {categories
                .filter((c) => form.categoryIds.includes(c.id))
                .map((c) => c.title)
                .join(", ")}
            </p>
          ) : null}
        </AdminField>

        <ProductMediaEditor
          key={galleryKey}
          items={mediaItems.length > 0 ? mediaItems : initial.mediaItems}
          onChange={setMediaItems}
        />

        <div className="rounded-lg border border-dashed border-zinc-300 p-4 space-y-3">
          <p className="text-sm font-medium text-zinc-800">Varyantlar (hacim, ton veya ikisi)</p>
          <p className="text-xs text-zinc-500">
            Tek seçenek: 30ml, 50ml, Light beige. İki seçenek (hacim + ton): satır etiketini{" "}
            <strong>30ml / Natural</strong> gibi yazın; seçenek adı örn. &quot;Hacim &amp; Ton&quot;.
          </p>
          <AdminField label="Seçenek adı (vitrinde)">
            <input
              className={inputClass}
              placeholder="Hacim veya Hacim & Ton"
              value={form.variantOptionName}
              onChange={(e) => set("variantOptionName", e.target.value)}
            />
          </AdminField>
          {form.variants.map((row, i) => (
            <div key={i} className="grid gap-2 rounded border bg-zinc-50 p-3 sm:grid-cols-6">
              <input
                className={inputClass}
                placeholder="30ml"
                value={row.label}
                onChange={(e) => {
                  const next = [...form.variants];
                  next[i] = { ...row, label: e.target.value };
                  set("variants", next);
                }}
              />
              <input
                className={inputClass}
                type="number"
                step="0.01"
                placeholder="Satış TL"
                value={row.price}
                onChange={(e) => {
                  const next = [...form.variants];
                  next[i] = { ...row, price: e.target.value };
                  set("variants", next);
                }}
              />
              <input
                className={inputClass}
                type="number"
                step="0.01"
                placeholder="Liste TL"
                value={row.compareAt}
                onChange={(e) => {
                  const next = [...form.variants];
                  next[i] = { ...row, compareAt: e.target.value };
                  set("variants", next);
                }}
              />
              <input
                className={inputClass}
                type="number"
                placeholder="Stok"
                value={row.stockQty}
                onChange={(e) => {
                  const next = [...form.variants];
                  next[i] = { ...row, stockQty: e.target.value };
                  set("variants", next);
                }}
              />
              <input
                className={inputClass}
                placeholder="SKU"
                value={row.sku}
                onChange={(e) => {
                  const next = [...form.variants];
                  next[i] = { ...row, sku: e.target.value };
                  set("variants", next);
                }}
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <input
                    type="radio"
                    name="defaultVariant"
                    checked={row.isDefault}
                    onChange={() =>
                      set(
                        "variants",
                        form.variants.map((v, j) => ({ ...v, isDefault: j === i })),
                      )
                    }
                  />
                  Varsayılan
                </label>
                <button
                  type="button"
                  className="text-xs text-red-600"
                  onClick={() => set("variants", form.variants.filter((_, j) => j !== i))}
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className={btnSecondary}
            onClick={() => set("variants", [...form.variants, emptyVariantRow()])}
          >
            + Varyant satırı
          </button>
        </div>

        <AdminField label="Ürün etiketleri" hint="Vitrinde rozet olarak görünür. Liste fiyatı &gt; satış fiyatı ise % indirim rozeti otomatik eklenir.">
          <div className="flex flex-wrap gap-2">
            {PRODUCT_BADGE_PRESETS.map((b) => {
              const on = form.badges.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    set(
                      "badges",
                      on ? form.badges.filter((x) => x !== b.id) : [...form.badges, b.id],
                    )
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    on ? "ring-2 ring-[var(--kn-brand)] ring-offset-1" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ color: b.color, backgroundColor: b.bg }}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </AdminField>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 space-y-4">
          <p className="text-sm font-semibold text-zinc-800">Ürün sayfası içeriği</p>
          <p className="text-xs text-zinc-500 -mt-2">
            Vitrindeki Description, Key Features ve How to Use metinleri. Düz metin yazın; satır sonları vitrinde korunur.
          </p>
          <AdminField label="Kısa açıklama (sayfa üstü)">
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Ürün kartı ve sayfa üstündeki kısa metin"
            />
          </AdminField>
          <AdminField label="Description">
            <textarea
              className={inputClass}
              rows={5}
              value={form.descriptionHtml}
              onChange={(e) => set("descriptionHtml", e.target.value)}
            />
          </AdminField>
          <AdminField label="Key Features">
            <textarea
              className={inputClass}
              rows={12}
              value={form.keyFeaturesHtml}
              onChange={(e) => set("keyFeaturesHtml", e.target.value)}
            />
          </AdminField>
          <AdminField label="How to Use">
            <textarea
              className={inputClass}
              rows={12}
              value={form.howToUseHtml}
              onChange={(e) => set("howToUseHtml", e.target.value)}
            />
          </AdminField>
          <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-zinc-800">Ürün ikon şeridi</p>
              <p className="mt-1 text-xs text-zinc-500">
                Sepete ekle butonunun altındaki 3 ikon alanı (ör. Derin Arındırma, Akıllı Formül, Besleyici).
                İkon URL boş bırakılırsa temadaki varsayılan görsel kalır.
              </p>
            </div>
            {Array.from({ length: PRODUCT_HIGHLIGHT_SLOTS }, (_, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-2">
                <AdminField label={`Etiket ${index + 1}`}>
                  <input
                    className={inputClass}
                    value={form.highlights[index]?.label ?? ""}
                    onChange={(e) => {
                      const next = [...form.highlights];
                      next[index] = { ...next[index], label: e.target.value };
                      set("highlights", next);
                    }}
                    placeholder="Örn. Derin Arındırma"
                  />
                </AdminField>
                <AdminField label={`İkon URL ${index + 1}`} hint="SVG/PNG — /api/media/... veya tema dosyası">
                  <input
                    className={inputClass}
                    value={form.highlights[index]?.iconUrl ?? ""}
                    onChange={(e) => {
                      const next = [...form.highlights];
                      next[index] = { ...next[index], iconUrl: e.target.value };
                      set("highlights", next);
                    }}
                    placeholder="/theme/techizmet-shop/cdn/shop/files/..."
                  />
                </AdminField>
              </div>
            ))}
          </div>
        </div>
        <ProductSeoOptimizer
          title={form.title}
          slug={form.slug}
          description={form.description || form.descriptionHtml}
          categoryIds={form.categoryIds}
          categoryId={form.categoryId}
          brandId={form.brandId}
          productId={form.id}
          onApply={(patch) => {
            if (patch.title != null) set("title", patch.title);
            if (patch.slug != null) set("slug", patch.slug);
            if (patch.seoTitle != null) set("seoTitle", patch.seoTitle);
            if (patch.seoDescription != null) set("seoDescription", patch.seoDescription);
            if (patch.description != null) set("description", patch.description);
            if (patch.descriptionHtml != null) set("descriptionHtml", patch.descriptionHtml);
            if (patch.keyFeaturesHtml != null) set("keyFeaturesHtml", patch.keyFeaturesHtml);
          }}
        />
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
            rows={2}
            value={form.seoDescription}
            onChange={(e) => set("seoDescription", e.target.value)}
          />
        </AdminField>

        <ProductExploreEditor
          looks={exploreLooks}
          useSiteDefault={useSiteDefaultExplore}
          onLooksChange={setExploreLooks}
          onUseSiteDefaultChange={(v) => {
            setUseSiteDefaultExplore(v);
            if (v && siteDefaultExplore.length) setExploreLooks([...siteDefaultExplore]);
          }}
          productOptions={allProducts}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => set("published", e.target.checked)}
          />
          Yayında
        </label>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <button type="button" className={btnPrimary} disabled={busy} onClick={save}>
        {busy ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </div>
  );
}
