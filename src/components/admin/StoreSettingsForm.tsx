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
import type { AnnouncementBarSlide } from "@/lib/mirror-announcement-bar";
import {
  normalizeAnnouncementSlidesFromSettings,
  serializeAnnouncementBarForSave,
} from "@/lib/mirror-announcement-bar";
import type { StoreTextSettings } from "@/lib/store-static-texts";

type ShipFromForm = NonNullable<NonNullable<SiteSettings["store"]>["shipFrom"]>;
type LegalForm = NonNullable<NonNullable<SiteSettings["store"]>["legal"]>;

function emptyShipFrom(): ShipFromForm {
  return { name: "", line1: "", line2: "", district: "", city: "", postalCode: "", phone: "" };
}

function emptyLegal(): Required<LegalForm> {
  return {
    tradeName: "",
    address: "",
    phone: "",
    email: "",
    mersisNo: "",
    taxOffice: "",
    taxNo: "",
    website: "",
    caymaEmail: "",
    arbitrationInfo: "",
  };
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
  const [legal, setLegal] = useState<LegalForm>({
    ...emptyLegal(),
    ...initial.store?.legal,
  });
  const [usdMarkup, setUsdMarkup] = useState(
    String(initial.store?.usdMarkupPercent ?? ""),
  );
  const [msg, setMsg] = useState<string | null>(null);

  function updateShipFrom<K extends keyof ShipFromForm>(key: K, value: ShipFromForm[K]) {
    setShipFrom((prev) => ({ ...prev, [key]: value }));
  }

  function updateLegal<K extends keyof LegalForm>(key: K, value: LegalForm[K]) {
    setLegal((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    const announcementSlides = normalizeAnnouncementSlidesFromSettings(s.theme?.announcementBar);
    const payload: SiteSettings = {
      ...s,
      theme: {
        ...s.theme,
        announcementBar: serializeAnnouncementBarForSave(s.theme?.announcementBar, announcementSlides),
      },
      store: {
        ...s.store,
        freeShippingOverMinor: tryInputToMinor(freeShippingTry),
        usdMarkupPercent: (() => {
          const n = parseFloat(usdMarkup.replace(",", "."));
          return Number.isFinite(n) && n >= 0 ? n : undefined;
        })(),
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
        legal: {
          tradeName: legal.tradeName?.trim() || undefined,
          address: legal.address?.trim() || undefined,
          phone: legal.phone?.trim() || undefined,
          email: legal.email?.trim() || undefined,
          mersisNo: legal.mersisNo?.trim() || undefined,
          taxOffice: legal.taxOffice?.trim() || undefined,
          taxNo: legal.taxNo?.trim() || undefined,
          website: legal.website?.trim() || undefined,
          caymaEmail: legal.caymaEmail?.trim() || undefined,
          arbitrationInfo: legal.arbitrationInfo?.trim() || undefined,
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
      setLegal({ ...emptyLegal(), ...payload.store?.legal });
    }
  }

  const threshold = tryInputToMinor(freeShippingTry);
  const storeTexts = s.store?.texts ?? {};
  const announcementBar = s.theme?.announcementBar ?? {};
  const announcementSlides = normalizeAnnouncementSlidesFromSettings(announcementBar);

  function updateAnnouncementSlide(index: number, patch: Partial<AnnouncementBarSlide>) {
    setS((prev) => {
      const prevSlides = normalizeAnnouncementSlidesFromSettings(prev.theme?.announcementBar);
      prevSlides[index] = { ...prevSlides[index], ...patch };
      return {
        ...prev,
        theme: {
          ...prev.theme,
          announcementBar: {
            ...prev.theme?.announcementBar,
            slides: prevSlides,
          },
        },
      };
    });
  }

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

  function updateCollectionFilterEnabled(
    key: keyof NonNullable<StoreTextSettings["collectionFilters"]>,
    enabled: boolean,
  ) {
    setS((prev) => ({
      ...prev,
      store: {
        ...prev.store,
        texts: {
          ...prev.store?.texts,
          collectionFilters: {
            ...prev.store?.texts?.collectionFilters,
            [key]: enabled,
          },
        },
      },
    }));
  }

  const collectionFilters = storeTexts.collectionFilters ?? {};

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

      <section className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 space-y-4">
        <h2 className="font-semibold">Sosyal giriş (Google / Apple)</h2>
        <p className="text-sm text-zinc-600">
          Şu an <strong>kapalı</strong> — kod hazır; kullanmak için kutuyu işaretleyin ve ortam
          değişkenlerini tanımlayın (
          <code className="rounded bg-zinc-100 px-1 text-xs">GOOGLE_CLIENT_*</code>,{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">APPLE_*</code>).
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.customerAuth?.googleEnabled === true}
            onChange={(e) =>
              setS((prev) => ({
                ...prev,
                customerAuth: { ...prev.customerAuth, googleEnabled: e.target.checked },
              }))
            }
          />
          Google ile giriş
        </label>
        <AdminField label="Google Client ID (isteğe bağlı — .env yerine)">
          <input
            className={inputClass}
            value={s.customerAuth?.googleClientId ?? ""}
            onChange={(e) =>
              setS((prev) => ({
                ...prev,
                customerAuth: { ...prev.customerAuth, googleClientId: e.target.value },
              }))
            }
            placeholder="GOOGLE_CLIENT_ID"
          />
        </AdminField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.customerAuth?.appleEnabled === true}
            onChange={(e) =>
              setS((prev) => ({
                ...prev,
                customerAuth: { ...prev.customerAuth, appleEnabled: e.target.checked },
              }))
            }
          />
          Apple ile giriş
        </label>
        <AdminField label="Apple Services ID (isteğe bağlı)">
          <input
            className={inputClass}
            value={s.customerAuth?.appleClientId ?? ""}
            onChange={(e) =>
              setS((prev) => ({
                ...prev,
                customerAuth: { ...prev.customerAuth, appleClientId: e.target.value },
              }))
            }
            placeholder="APPLE_CLIENT_ID"
          />
        </AdminField>
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

      <section id="mesafeli-satis-legal" className="scroll-mt-6 rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Mesafeli satış sözleşmesi — satıcı bilgileri</h2>
        <p className="text-sm text-zinc-600">
          Bu alanlar{" "}
          <Link href="/pages/mesafeli-satis" target="_blank" className="text-[var(--kn-brand)] underline">
            mesafeli satış sözleşmesi
          </Link>{" "}
          ve ödeme ekranındaki ön bilgilendirme formuna otomatik yazılır. Boş bırakılan alanlar e-fatura
          satıcı bilgileri ve kargo gönderici adresinden tamamlanır.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Ticari unvan">
            <input
              className={inputClass}
              value={legal.tradeName ?? ""}
              onChange={(e) => updateLegal("tradeName", e.target.value)}
              placeholder="Anatolian Paw Pet Gıda Ltd. Şti."
            />
          </AdminField>
          <AdminField label="MERSİS No">
            <input
              className={inputClass}
              value={legal.mersisNo ?? ""}
              onChange={(e) => updateLegal("mersisNo", e.target.value)}
            />
          </AdminField>
          <div className="sm:col-span-2">
            <AdminField label="E-posta">
              <input
                className={inputClass}
                type="email"
                value={legal.email ?? ""}
                onChange={(e) => updateLegal("email", e.target.value)}
                placeholder="info@anatolianpaw.com"
              />
            </AdminField>
          </div>
          <AdminField label="Cayma bildirimi e-postası">
            <input
              className={inputClass}
              type="email"
              value={legal.caymaEmail ?? ""}
              onChange={(e) => updateLegal("caymaEmail", e.target.value)}
              placeholder="cayma@anatolianpaw.com"
            />
          </AdminField>
          <AdminField label="Telefon">
            <input
              className={inputClass}
              value={legal.phone ?? ""}
              onChange={(e) => updateLegal("phone", e.target.value)}
            />
          </AdminField>
          <AdminField label="Web sitesi" hint="Boşsa mağaza URL'si kullanılır">
            <input
              className={inputClass}
              value={legal.website ?? ""}
              onChange={(e) => updateLegal("website", e.target.value)}
              placeholder="https://www.anatolianpaw.com"
            />
          </AdminField>
          <div className="sm:col-span-2">
            <AdminField label="Vergi dairesi">
              <input
                className={inputClass}
                value={legal.taxOffice ?? ""}
                onChange={(e) => updateLegal("taxOffice", e.target.value)}
              />
            </AdminField>
          </div>
          <AdminField label="Vergi no (VKN)">
            <input
              className={inputClass}
              value={legal.taxNo ?? ""}
              onChange={(e) => updateLegal("taxNo", e.target.value.replace(/\D/g, "").slice(0, 11))}
            />
          </AdminField>
          <div className="sm:col-span-2">
            <AdminField label="Açık adres" hint="Boşsa kargo gönderici adresi kullanılır">
              <textarea
                className={textareaClass}
                value={legal.address ?? ""}
                onChange={(e) => updateLegal("address", e.target.value)}
              />
            </AdminField>
          </div>
          <div className="sm:col-span-2">
            <AdminField label="Tüketici hakem heyeti bilgisi">
              <textarea
                className={textareaClass}
                value={legal.arbitrationInfo ?? ""}
                onChange={(e) => updateLegal("arbitrationInfo", e.target.value)}
                placeholder="İl/ilçe Tüketici Hakem Heyeti"
              />
            </AdminField>
          </div>
        </div>
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

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">İngilizce vitrin — USD döviz kuru marjı</h2>
        <p className="text-sm text-zinc-600">
          İngilizce sayfada fiyatlar serbest piyasa USD/TRY kuruna göre dolara çevrilir.
          Marjı siz belirleyin — piyasa kuruna bu yüzde kadar eklenir.
          Örn. 5 = piyasa kuru × 1,05 (sizi kur dalgalanmalarına karşı korur).
        </p>
        <AdminField label="Kur marjı (%)">
          <input
            className={inputClass}
            type="number"
            min={0}
            max={100}
            step={0.5}
            placeholder="Örn. 5"
            value={usdMarkup}
            onChange={(e) => setUsdMarkup(e.target.value)}
          />
        </AdminField>
        {(() => {
          const n = parseFloat(usdMarkup.replace(",", "."));
          if (Number.isFinite(n) && n > 0) {
            return (
              <p className="text-sm text-blue-700">
                Aktif: piyasa kuruna %{n} eklenir. Örn. kur 35 TL ise vitrinde {(35 * (1 + n / 100)).toFixed(2)} TL karşılığı dolar gösterilir.
              </p>
            );
          }
          return <p className="text-sm text-zinc-500">0 veya boş = piyasa kuru aynen kullanılır.</p>;
        })()}
      </section>

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="font-semibold">Üst duyuru şeridi</h2>
          <p className="text-sm text-zinc-600">
            Sitenin en üstündeki kayan yazılar (ücretsiz kargo + kampanya metni). Tüm sayfalarda
            görünür. İlk slayt boş bırakılırsa ücretsiz kargo eşiğinden otomatik üretilir.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={announcementBar.enabled !== false}
            onChange={(e) =>
              setS((prev) => ({
                ...prev,
                theme: {
                  ...prev.theme,
                  announcementBar: {
                    ...prev.theme?.announcementBar,
                    enabled: e.target.checked,
                  },
                },
              }))
            }
          />
          Duyuru şeridi görünsün
        </label>
        <AdminField label="1. slayt (ücretsiz kargo vb.)">
          <input
            className={inputClass}
            value={announcementSlides[0]?.text ?? ""}
            onChange={(e) => updateAnnouncementSlide(0, { text: e.target.value })}
            placeholder={
              threshold > 0
                ? `${threshold / 100} TL üzeri siparişlerde ücretsiz kargo`
                : "300 TL üzeri siparişlerde ücretsiz kargo"
            }
          />
        </AdminField>
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="2. slayt — metin">
            <input
              className={inputClass}
              value={announcementSlides[1]?.text ?? ""}
              onChange={(e) => updateAnnouncementSlide(1, { text: e.target.value })}
              placeholder="Örn. Premium kedi mamalarında %20 indirim"
            />
          </AdminField>
          <AdminField label="2. slayt — link metni (isteğe bağlı)" hint="Boş bırakırsanız sayfada link görünmez.">
            <input
              className={inputClass}
              value={announcementSlides[1]?.linkLabel ?? ""}
              onChange={(e) => updateAnnouncementSlide(1, { linkLabel: e.target.value })}
              placeholder="Hemen Al!"
            />
          </AdminField>
        </div>
        <AdminField label="2. slayt — link adresi (isteğe bağlı)" hint="Boş bırakırsanız yalnızca metin gösterilir.">
          <input
            className={inputClass}
            value={announcementSlides[1]?.linkHref ?? ""}
            onChange={(e) => updateAnnouncementSlide(1, { linkHref: e.target.value })}
            placeholder="/collections"
          />
        </AdminField>
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

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-800">Koleksiyon filtreleri (/collections/all)</h3>
          <p className="text-sm text-zinc-600">
            Filtre seçenekleri yayındaki ürünlerden otomatik üretilir: marka, hacim/ton (varyant veya gramaj),
            adet (paket adedi), fiyat aralığı (TL), stok durumu.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["price", "Fiyat"],
                ["brand", "Marka"],
                ["tones", "Tonlar"],
                ["volume", "Hacim"],
                ["quantity", "Adet"],
                ["stock", "Stok durumu"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={collectionFilters[key] !== false}
                  onChange={(e) => updateCollectionFilterEnabled(key, e.target.checked)}
                />
                {label} filtresini göster
              </label>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Fiyat başlığı (TR)">
              <input className={inputClass} value={storeTexts.mirrorPriceLabelTr ?? ""} onChange={(e) => updateStoreText("mirrorPriceLabelTr", e.target.value)} />
            </AdminField>
            <AdminField label="Price title (EN)">
              <input className={inputClass} value={storeTexts.mirrorPriceLabelEn ?? ""} onChange={(e) => updateStoreText("mirrorPriceLabelEn", e.target.value)} />
            </AdminField>
            <AdminField label="Marka başlığı (TR)">
              <input className={inputClass} value={storeTexts.mirrorBrandLabelTr ?? ""} onChange={(e) => updateStoreText("mirrorBrandLabelTr", e.target.value)} />
            </AdminField>
            <AdminField label="Brand title (EN)">
              <input className={inputClass} value={storeTexts.mirrorBrandLabelEn ?? ""} onChange={(e) => updateStoreText("mirrorBrandLabelEn", e.target.value)} />
            </AdminField>
            <AdminField label="Tonlar başlığı (TR)">
              <input className={inputClass} value={storeTexts.mirrorTonesLabelTr ?? ""} onChange={(e) => updateStoreText("mirrorTonesLabelTr", e.target.value)} />
            </AdminField>
            <AdminField label="Tones title (EN)">
              <input className={inputClass} value={storeTexts.mirrorTonesLabelEn ?? ""} onChange={(e) => updateStoreText("mirrorTonesLabelEn", e.target.value)} />
            </AdminField>
            <AdminField label="Hacim başlığı (TR)">
              <input className={inputClass} value={storeTexts.mirrorVolumeLabelTr ?? ""} onChange={(e) => updateStoreText("mirrorVolumeLabelTr", e.target.value)} />
            </AdminField>
            <AdminField label="Volume title (EN)">
              <input className={inputClass} value={storeTexts.mirrorVolumeLabelEn ?? ""} onChange={(e) => updateStoreText("mirrorVolumeLabelEn", e.target.value)} />
            </AdminField>
            <AdminField label="Adet başlığı (TR)">
              <input className={inputClass} value={storeTexts.mirrorQuantityLabelTr ?? ""} onChange={(e) => updateStoreText("mirrorQuantityLabelTr", e.target.value)} />
            </AdminField>
            <AdminField label="Quantity title (EN)">
              <input className={inputClass} value={storeTexts.mirrorQuantityLabelEn ?? ""} onChange={(e) => updateStoreText("mirrorQuantityLabelEn", e.target.value)} />
            </AdminField>
            <AdminField label="Stok başlığı (TR)">
              <input className={inputClass} value={storeTexts.mirrorStockLabelTr ?? ""} onChange={(e) => updateStoreText("mirrorStockLabelTr", e.target.value)} />
            </AdminField>
            <AdminField label="Stock title (EN)">
              <input className={inputClass} value={storeTexts.mirrorStockLabelEn ?? ""} onChange={(e) => updateStoreText("mirrorStockLabelEn", e.target.value)} />
            </AdminField>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-800">Ana sayfa ürün sıralaması</h3>
          <p className="text-sm text-zinc-600">
            Ana sayfadaki otomatik ürün listelerinin (swiper bölümleri) hangi sırayla doldurulacağını belirler.
            Vitrin editöründeki manuel ürün seçimleri etkilenmez.
          </p>
          <AdminField label="Sıralama">
            <select
              className={inputClass}
              value={storeTexts.homeListingSort ?? "manual"}
              onChange={(e) =>
                updateStoreText(
                  "homeListingSort",
                  e.target.value as NonNullable<StoreTextSettings["homeListingSort"]>,
                )
              }
            >
              <option value="manual">Manuel (sürükle-bırak)</option>
              <option value="title_asc">Ada göre (A→Z)</option>
              <option value="title_desc">Ada göre (Z→A)</option>
              <option value="newest">En yeni</option>
              <option value="oldest">En eski</option>
              <option value="price_asc">Fiyat (düşük→yüksek)</option>
              <option value="price_desc">Fiyat (yüksek→düşük)</option>
            </select>
          </AdminField>
          <p className="text-xs text-zinc-500">
            Manuel sıra için{" "}
            <Link href="/admin/products/home-order" className="text-[var(--kn-brand)] underline">
              Ürünler → Ürün sırası
            </Link>{" "}
            sayfasından sürükleyip kaydedin (ana sayfa ve katalog ayrı).
          </p>
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
