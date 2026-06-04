"use client";

import Link from "next/link";
import { useState } from "react";
import { orderNumberPreview, sanitizeOrderNumberPrefix } from "@/lib/admin/order-number";
import { DEFAULT_BARCODE_PREFIX } from "@/lib/admin/product-barcode";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";
import {
  DEFAULT_MAINTENANCE_MESSAGE_TR,
  DEFAULT_MAINTENANCE_TITLE_TR,
} from "@/lib/maintenance-mode";
import type { SiteSettings } from "@/lib/site-settings";
import type { StoreTextSettings } from "@/lib/store-static-texts";

type ShipFromForm = NonNullable<NonNullable<SiteSettings["store"]>["shipFrom"]>;

function emptyShipFrom(): ShipFromForm {
  return { name: "", line1: "", line2: "", district: "", city: "", postalCode: "", phone: "" };
}

function minorToTryInput(minor: number | undefined): string {
  if (minor == null || minor <= 0) return "";
  return String(minor / 100);
}

function tryInputToMinor(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

const textareaClass = `${inputClass} min-h-[88px] resize-y`;

export function StoreSettingsForm({ initial }: { initial: SiteSettings }) {
  const [s, setS] = useState(initial);
  const [freeShippingTry, setFreeShippingTry] = useState(
    minorToTryInput(initial.store?.freeShippingOverMinor),
  );
  const [orderPrefix, setOrderPrefix] = useState(initial.store?.orderNumberPrefix ?? "KN");
  const [autoGenerateBarcode, setAutoGenerateBarcode] = useState(
    initial.store?.autoGenerateBarcode === true,
  );
  const [barcodePrefix, setBarcodePrefix] = useState(
    initial.store?.barcodePrefix ?? DEFAULT_BARCODE_PREFIX,
  );
  const [shipFrom, setShipFrom] = useState<ShipFromForm>({
    ...emptyShipFrom(),
    ...initial.store?.shipFrom,
  });
  const [msg, setMsg] = useState<string | null>(null);

  function updateShipFrom<K extends keyof ShipFromForm>(key: K, value: ShipFromForm[K]) {
    setShipFrom((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    const payload: SiteSettings = {
      ...s,
      store: {
        ...s.store,
        freeShippingOverMinor: tryInputToMinor(freeShippingTry),
        orderNumberPrefix: sanitizeOrderNumberPrefix(orderPrefix),
        autoGenerateBarcode,
        barcodePrefix: barcodePrefix.replace(/\D/g, "").slice(0, 3) || DEFAULT_BARCODE_PREFIX,
        shipFrom: {
          name: shipFrom.name?.trim() || undefined,
          line1: shipFrom.line1?.trim() || undefined,
          line2: shipFrom.line2?.trim() || undefined,
          district: shipFrom.district?.trim() || undefined,
          city: shipFrom.city?.trim() || undefined,
          postalCode: shipFrom.postalCode?.trim() || undefined,
          phone: shipFrom.phone?.trim() || undefined,
        },
      },
    };
    const res = await fetch("/api/admin/integrations/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMsg(res.ok ? "Kaydedildi" : "Kayıt başarısız");
    if (res.ok) {
      setS(payload);
      setShipFrom({ ...emptyShipFrom(), ...payload.store?.shipFrom });
    }
  }

  const threshold = tryInputToMinor(freeShippingTry);
  const storeTexts = s.store?.texts ?? {};

  function updateStoreText<K extends keyof StoreTextSettings>(key: K, value: StoreTextSettings[K]) {
    setS((prev) => ({
      ...prev,
      store: {
        ...prev.store,
        texts: {
          ...prev.store?.texts,
          [key]: value,
        },
      },
    }));
  }

  function updateBlockText(key: keyof NonNullable<StoreTextSettings["blocks"]>, value: string) {
    setS((prev) => ({
      ...prev,
      store: {
        ...prev.store,
        texts: {
          ...prev.store?.texts,
          blocks: {
            ...prev.store?.texts?.blocks,
            [key]: value,
          },
        },
      },
    }));
  }

  const maintenance = s.maintenance ?? {};

  return (
    <div className="max-w-4xl space-y-6">
      <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-amber-950">Site bakım modu</h2>
            <p className="mt-1 text-sm text-amber-900/80">
              Açıkken ziyaretçiler mağazayı göremez; &quot;Kısa süre sonra buradayız&quot; bakım sayfası
              görür. Yönetim paneline giriş yapmış personel siteyi normal gezebilir.
            </p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-950">
            <input
              type="checkbox"
              checked={maintenance.enabled === true}
              onChange={(e) =>
                setS((prev) => ({
                  ...prev,
                  maintenance: { ...prev.maintenance, enabled: e.target.checked },
                }))
              }
            />
            Bakım açık
          </label>
        </div>
        <AdminField label="Başlık">
          <input
            className={inputClass}
            value={maintenance.title ?? ""}
            onChange={(e) =>
              setS((prev) => ({
                ...prev,
                maintenance: { ...prev.maintenance, title: e.target.value || null },
              }))
            }
            placeholder={DEFAULT_MAINTENANCE_TITLE_TR}
          />
        </AdminField>
        <AdminField label="Açıklama metni">
          <textarea
            className={textareaClass}
            rows={3}
            value={maintenance.message ?? ""}
            onChange={(e) =>
              setS((prev) => ({
                ...prev,
                maintenance: { ...prev.maintenance, message: e.target.value || null },
              }))
            }
            placeholder={DEFAULT_MAINTENANCE_MESSAGE_TR}
          />
        </AdminField>
        {maintenance.enabled ? (
          <p className="text-xs text-amber-800">
            Canlı önizleme:{" "}
            <a href="/bakim" target="_blank" rel="noopener noreferrer" className="font-medium underline">
              /bakim
            </a>
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Sipariş numarası</h2>
        <p className="text-sm text-zinc-600">
          Web sitesinden verilen siparişlerin numarası bu önek ile başlar. Pazaryeri siparişleri
          kendi formatını kullanır (ör. TY-…). B2B / bayi grupları için{" "}
          <Link href="/admin/customer-groups" className="text-[var(--kn-brand)] underline">
            üye grupları
          </Link>{" "}
          ekranından grup bazlı önek tanımlayabilirsiniz.
        </p>
        <AdminField label="Sipariş no öneki" hint="2–8 karakter, harf ve rakam. Örnek: KN, SHOP, KNG">
          <input
            className={`${inputClass} max-w-xs uppercase`}
            value={orderPrefix}
            onChange={(e) => setOrderPrefix(e.target.value.toUpperCase())}
            placeholder="KN"
            maxLength={8}
          />
        </AdminField>
        <p className="text-sm text-zinc-500">
          Örnek format: <strong>{orderNumberPreview(orderPrefix)}</strong>
        </p>
      </section>

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Ürün barkodu</h2>
        <p className="text-sm text-zinc-600">
          Pazaryeri entegrasyonları barkod ile ürün eşleştirir. Boş bırakılan ürünlere otomatik EAN-13
          (13 hane) üretilebilir.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoGenerateBarcode}
            onChange={(e) => setAutoGenerateBarcode(e.target.checked)}
          />
          Yeni ürünlerde barkod boşsa otomatik oluştur
        </label>
        <AdminField
          label="Barkod öneki (3 hane)"
          hint={`EAN-13 formatında ilk 3 rakam. Varsayılan: ${DEFAULT_BARCODE_PREFIX}`}
        >
          <input
            className={`${inputClass} max-w-xs`}
            value={barcodePrefix}
            onChange={(e) => setBarcodePrefix(e.target.value.replace(/\D/g, "").slice(0, 3))}
            placeholder={DEFAULT_BARCODE_PREFIX}
            maxLength={3}
          />
        </AdminField>
      </section>

      <section id="kn-ship-from" className="scroll-mt-6 rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Kargo etiketi — gönderici adresi</h2>
        <p className="text-sm text-zinc-600">
          Kargo etiketlerinde &quot;Gönderen&quot; olarak görünür.{" "}
          <Link href="/admin/orders/labels" className="text-[var(--kn-brand)] underline">
            Kargo Etiketi Yazdır
          </Link>{" "}
          ekranında da düzenlenebilir; buradan kaydettiğiniz adres varsayılan olur.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Firma / mağaza adı *">
            <input
              className={inputClass}
              value={shipFrom.name ?? ""}
              onChange={(e) => updateShipFrom("name", e.target.value)}
              placeholder="Techizmet Shop"
            />
          </AdminField>
          <AdminField label="Telefon">
            <input
              className={inputClass}
              value={shipFrom.phone ?? ""}
              onChange={(e) => updateShipFrom("phone", e.target.value)}
              placeholder="05xx xxx xx xx"
            />
          </AdminField>
          <AdminField label="Adres satırı 1 *" hint="Mahalle, sokak, bina no">
            <input
              className={`${inputClass} sm:col-span-2`}
              value={shipFrom.line1 ?? ""}
              onChange={(e) => updateShipFrom("line1", e.target.value)}
            />
          </AdminField>
          <AdminField label="Adres satırı 2">
            <input
              className={inputClass}
              value={shipFrom.line2 ?? ""}
              onChange={(e) => updateShipFrom("line2", e.target.value)}
            />
          </AdminField>
          <AdminField label="İlçe">
            <input
              className={inputClass}
              value={shipFrom.district ?? ""}
              onChange={(e) => updateShipFrom("district", e.target.value)}
            />
          </AdminField>
          <AdminField label="İl *">
            <input
              className={inputClass}
              value={shipFrom.city ?? ""}
              onChange={(e) => updateShipFrom("city", e.target.value)}
            />
          </AdminField>
          <AdminField label="Posta kodu">
            <input
              className={inputClass}
              value={shipFrom.postalCode ?? ""}
              onChange={(e) => updateShipFrom("postalCode", e.target.value)}
            />
          </AdminField>
        </div>
        {shipFrom.name?.trim() && shipFrom.line1?.trim() && shipFrom.city?.trim() ? (
          <p className="text-sm text-green-700">Gönderici adresi kayda hazır.</p>
        ) : (
          <p className="text-sm text-amber-800">Etiket için en az firma adı, adres ve il doldurun.</p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Ücretsiz kargo eşiği</h2>
        <p className="text-sm text-zinc-600">
          Sepet ara toplamı bu tutarı geçince kargo ücreti alınmaz (kampanya kuponu olmadan da geçerli).
          Checkout ve sepette müşteriye gösterilir.
        </p>
        <AdminField label="Minimum sepet tutarı (TL)">
          <input
            className={inputClass}
            type="number"
            min={0}
            step={1}
            placeholder="Örn. 300"
            value={freeShippingTry}
            onChange={(e) => setFreeShippingTry(e.target.value)}
          />
        </AdminField>
        {threshold > 0 ? (
          <p className="text-sm text-green-700">
            Aktif: {threshold / 100} TL ve üzeri siparişlerde ücretsiz kargo.
          </p>
        ) : (
          <p className="text-sm text-zinc-500">Boş veya 0 = ücretsiz kargo eşiği kapalı.</p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-6 space-y-6">
        <div className="space-y-1">
          <h2 className="font-semibold">Vitrin sabit metinleri</h2>
          <p className="text-sm text-zinc-600">
            Admin dışında kodda kalan fallback metinleri buradan yönetebilirsiniz. Özellikle blok
            modu, koleksiyon fallback sayfası ve mirror ürün/koleksiyon etiketleri için kullanılır.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-800">Blok modu etiketleri</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Keşfet butonu">
              <input
                className={inputClass}
                value={storeTexts.blocks?.explore ?? ""}
                onChange={(e) => updateBlockText("explore", e.target.value)}
              />
            </AdminField>
            <AdminField label="Devam butonu">
              <input
                className={inputClass}
                value={storeTexts.blocks?.continue ?? ""}
                onChange={(e) => updateBlockText("continue", e.target.value)}
              />
            </AdminField>
            <AdminField label="Detay linki">
              <input
                className={inputClass}
                value={storeTexts.blocks?.detail ?? ""}
                onChange={(e) => updateBlockText("detail", e.target.value)}
              />
            </AdminField>
            <AdminField label="Ürün sayısı etiketi">
              <input
                className={inputClass}
                value={storeTexts.blocks?.products ?? ""}
                onChange={(e) => updateBlockText("products", e.target.value)}
              />
            </AdminField>
            <AdminField label="Bülten butonu">
              <input
                className={inputClass}
                value={storeTexts.blocks?.subscribe ?? ""}
                onChange={(e) => updateBlockText("subscribe", e.target.value)}
              />
            </AdminField>
            <AdminField label="E-posta placeholder">
              <input
                className={inputClass}
                value={storeTexts.blocks?.emailPlaceholder ?? ""}
                onChange={(e) => updateBlockText("emailPlaceholder", e.target.value)}
              />
            </AdminField>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-800">Koleksiyon fallback sayfası</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Başlık (TR)">
              <input
                className={inputClass}
                value={storeTexts.collectionsListTitleTr ?? ""}
                onChange={(e) => updateStoreText("collectionsListTitleTr", e.target.value)}
              />
            </AdminField>
            <AdminField label="Title (EN)">
              <input
                className={inputClass}
                value={storeTexts.collectionsListTitleEn ?? ""}
                onChange={(e) => updateStoreText("collectionsListTitleEn", e.target.value)}
              />
            </AdminField>
            <AdminField label="Açıklama (TR)">
              <textarea
                className={textareaClass}
                value={storeTexts.collectionsListLeadTr ?? ""}
                onChange={(e) => updateStoreText("collectionsListLeadTr", e.target.value)}
              />
            </AdminField>
            <AdminField label="Description (EN)">
              <textarea
                className={textareaClass}
                value={storeTexts.collectionsListLeadEn ?? ""}
                onChange={(e) => updateStoreText("collectionsListLeadEn", e.target.value)}
              />
            </AdminField>
            <AdminField label="Boş durum metni (TR)">
              <textarea
                className={textareaClass}
                value={storeTexts.collectionsListEmptyTr ?? ""}
                onChange={(e) => updateStoreText("collectionsListEmptyTr", e.target.value)}
              />
            </AdminField>
            <AdminField label="Empty state text (EN)">
              <textarea
                className={textareaClass}
                value={storeTexts.collectionsListEmptyEn ?? ""}
                onChange={(e) => updateStoreText("collectionsListEmptyEn", e.target.value)}
              />
            </AdminField>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-800">Boş ürün ızgarası</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Metin (TR)">
              <textarea
                className={textareaClass}
                value={storeTexts.productGridEmptyTr ?? ""}
                onChange={(e) => updateStoreText("productGridEmptyTr", e.target.value)}
              />
            </AdminField>
            <AdminField label="Text (EN)">
              <textarea
                className={textareaClass}
                value={storeTexts.productGridEmptyEn ?? ""}
                onChange={(e) => updateStoreText("productGridEmptyEn", e.target.value)}
              />
            </AdminField>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-800">Mirror koleksiyon ve ürün etiketleri</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Kategori filtresi başlığı (TR)">
              <input
                className={inputClass}
                value={storeTexts.mirrorCategoriesLabelTr ?? ""}
                onChange={(e) => updateStoreText("mirrorCategoriesLabelTr", e.target.value)}
              />
            </AdminField>
            <AdminField label="Category filter title (EN)">
              <input
                className={inputClass}
                value={storeTexts.mirrorCategoriesLabelEn ?? ""}
                onChange={(e) => updateStoreText("mirrorCategoriesLabelEn", e.target.value)}
              />
            </AdminField>
            <AdminField label="Ürün sayacı tekil (TR)">
              <input
                className={inputClass}
                value={storeTexts.mirrorProductCountSingularTr ?? ""}
                onChange={(e) => updateStoreText("mirrorProductCountSingularTr", e.target.value)}
              />
            </AdminField>
            <AdminField label="Product counter singular (EN)">
              <input
                className={inputClass}
                value={storeTexts.mirrorProductCountSingularEn ?? ""}
                onChange={(e) => updateStoreText("mirrorProductCountSingularEn", e.target.value)}
              />
            </AdminField>
            <AdminField label="Ürün sayacı çoğul (TR)">
              <input
                className={inputClass}
                value={storeTexts.mirrorProductCountPluralTr ?? ""}
                onChange={(e) => updateStoreText("mirrorProductCountPluralTr", e.target.value)}
              />
            </AdminField>
            <AdminField label="Product counter plural (EN)">
              <input
                className={inputClass}
                value={storeTexts.mirrorProductCountPluralEn ?? ""}
                onChange={(e) => updateStoreText("mirrorProductCountPluralEn", e.target.value)}
              />
            </AdminField>
            <AdminField label="Tükendi rozeti (TR)">
              <input
                className={inputClass}
                value={storeTexts.mirrorSoldOutBadgeTr ?? ""}
                onChange={(e) => updateStoreText("mirrorSoldOutBadgeTr", e.target.value)}
              />
            </AdminField>
            <AdminField label="Sold out badge (EN)">
              <input
                className={inputClass}
                value={storeTexts.mirrorSoldOutBadgeEn ?? ""}
                onChange={(e) => updateStoreText("mirrorSoldOutBadgeEn", e.target.value)}
              />
            </AdminField>
            <AdminField label="Düşük stok öneki (TR)" hint='Örnek: "Son" => "Son 2"'>
              <input
                className={inputClass}
                value={storeTexts.mirrorLowStockPrefixTr ?? ""}
                onChange={(e) => updateStoreText("mirrorLowStockPrefixTr", e.target.value)}
              />
            </AdminField>
            <AdminField label='Low stock prefix (EN)' hint='Example: "Only" => "Only 2"'>
              <input
                className={inputClass}
                value={storeTexts.mirrorLowStockPrefixEn ?? ""}
                onChange={(e) => updateStoreText("mirrorLowStockPrefixEn", e.target.value)}
              />
            </AdminField>
            <AdminField label="Başlayan fiyat öneki (TR)">
              <input
                className={inputClass}
                value={storeTexts.mirrorStartingPricePrefixTr ?? ""}
                onChange={(e) => updateStoreText("mirrorStartingPricePrefixTr", e.target.value)}
              />
            </AdminField>
            <AdminField label="Starting price prefix (EN)">
              <input
                className={inputClass}
                value={storeTexts.mirrorStartingPricePrefixEn ?? ""}
                onChange={(e) => updateStoreText("mirrorStartingPricePrefixEn", e.target.value)}
              />
            </AdminField>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 space-y-3">
        <h2 className="font-semibold">İlgili ayarlar</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600">
          <li>
            Kupon ile ücretsiz kargo:{" "}
            <Link href="/admin/campaigns" className="text-[var(--kn-brand)] underline">
              Kampanyalar
            </Link>
          </li>
          <li>
            Kargo firması ve tarifeler:{" "}
            <Link href="/admin/shipping" className="text-[var(--kn-brand)] underline">
              Kargo firmaları
            </Link>
          </li>
          <li>
            PayTR / havale:{" "}
            <Link href="/admin/integrations/payments" className="text-[var(--kn-brand)] underline">
              Ödeme ayarları
            </Link>
          </li>
        </ul>
      </section>

      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
      <button type="button" className={btnPrimary} onClick={save}>
        Kaydet
      </button>
    </div>
  );
}
