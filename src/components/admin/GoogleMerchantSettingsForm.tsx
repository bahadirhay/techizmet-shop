"use client";

import { useState } from "react";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";

type GmcFormState = {
  enabled: boolean;
  googleProductCategory: string;
  currency: string;
  defaultBrand: string;
  condition: "new" | "refurbished" | "used";
  shippingCountry: string;
  shippingPriceMinor: number;
  feedToken: string;
  hasFeedToken: boolean;
  feedUrl: string;
  feedUrlPublic: string;
};

export function GoogleMerchantSettingsForm({
  initial,
  siteName,
}: {
  initial: GmcFormState;
  siteName: string;
}) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/settings/google-merchant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        googleMerchant: {
          enabled: s.enabled,
          googleProductCategory: s.googleProductCategory,
          currency: s.currency,
          defaultBrand: s.defaultBrand,
          condition: s.condition,
          shippingCountry: s.shippingCountry,
          shippingPriceMinor: s.shippingPriceMinor,
          feedToken: s.feedToken || undefined,
        },
      }),
    });
    const j = (await res.json()) as { googleMerchant?: GmcFormState; error?: string };
    setBusy(false);
    if (res.ok && j.googleMerchant) {
      setS({ ...s, ...j.googleMerchant, feedToken: "" });
      setMsg("Kaydedildi");
    } else {
      setMsg(j.error ?? "Kayıt başarısız");
    }
  }

  const displayFeedUrl = s.feedToken.trim()
    ? `${s.feedUrlPublic.split("?")[0]}?token=••••`
    : s.feedUrl;

  return (
    <div className="admin-card admin-card-pad max-w-3xl space-y-6">
      <p className="text-sm text-zinc-600">
        Google Merchant Center için ürün feed&apos;i (RSS 2.0 XML). Feed URL&apos;sini Merchant Center&apos;a
        ekleyerek ürünlerinizi Google Alışveriş&apos;te listeleyebilirsiniz.
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={s.enabled}
          onChange={(e) => setS({ ...s, enabled: e.target.checked })}
        />
        Feed&apos;i etkinleştir
      </label>

      <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-4 text-sm text-zinc-700 space-y-2">
        <p className="font-semibold text-zinc-900">Feed URL (Merchant Center&apos;a yapıştırın)</p>
        <code className="block break-all rounded bg-white px-2 py-1 text-xs border">{displayFeedUrl}</code>
        {s.hasFeedToken && !s.feedToken ? (
          <p className="text-xs text-zinc-500">Token korumalı — tam URL kayıtlı ayarda.</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Varsayılan marka">
          <input
            className={inputClass}
            value={s.defaultBrand}
            onChange={(e) => setS({ ...s, defaultBrand: e.target.value })}
            placeholder={siteName}
          />
        </AdminField>
        <AdminField label="Google ürün kategorisi (ID)">
          <input
            className={inputClass}
            value={s.googleProductCategory}
            onChange={(e) => setS({ ...s, googleProductCategory: e.target.value })}
            placeholder="5015"
          />
        </AdminField>
        <AdminField label="Para birimi">
          <input
            className={inputClass}
            value={s.currency}
            onChange={(e) => setS({ ...s, currency: e.target.value.toUpperCase() })}
            placeholder="TRY"
          />
        </AdminField>
        <AdminField label="Ürün durumu">
          <select
            className={inputClass}
            value={s.condition}
            onChange={(e) =>
              setS({ ...s, condition: e.target.value as GmcFormState["condition"] })
            }
          >
            <option value="new">Yeni (new)</option>
            <option value="refurbished">Yenilenmiş</option>
            <option value="used">Kullanılmış</option>
          </select>
        </AdminField>
        <AdminField label="Kargo ülkesi">
          <input
            className={inputClass}
            value={s.shippingCountry}
            onChange={(e) => setS({ ...s, shippingCountry: e.target.value.toUpperCase() })}
            placeholder="TR"
          />
        </AdminField>
        <AdminField label="Kargo ücreti (kuruş)">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={s.shippingPriceMinor}
            onChange={(e) => setS({ ...s, shippingPriceMinor: Number(e.target.value) || 0 })}
            placeholder="0 = ücretsiz"
          />
        </AdminField>
        <AdminField label="Feed token (isteğe bağlı)">
          <input
            type="password"
            className={inputClass}
            value={s.feedToken}
            onChange={(e) => setS({ ...s, feedToken: e.target.value })}
            placeholder={s.hasFeedToken ? "Kayıtlı — değiştirmek için yazın" : "Boş = herkese açık URL"}
          />
        </AdminField>
      </div>

      <section className="rounded-lg border bg-zinc-50 p-4 text-sm text-zinc-700 space-y-3">
        <h3 className="font-semibold text-zinc-900">Google Merchant Center kurulum adımları</h3>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <a
              href="https://merchants.google.com/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              merchants.google.com
            </a>{" "}
            üzerinde mağaza hesabı oluşturun ve işletme bilgilerini doğrulayın.
          </li>
          <li>
            <strong>Ürünler → Feed&apos;ler → +</strong> → <em>URL ile çekilen feed</em> seçin.
          </li>
          <li>
            Yukarıdaki feed URL&apos;sini yapıştırın. Dosya adı <code>.xml</code> ile bitmeli (otomatik).
          </li>
          <li>Güncelleme sıklığı: <strong>günlük</strong> önerilir.</li>
          <li>
            Ürünlerde <strong>barkod (GTIN)</strong> ve <strong>marka</strong> alanlarını doldurun — onay
            oranı artar.
          </li>
          <li>
            Site doğrulaması için{" "}
            <a href="/admin/settings/seo" className="underline">
              Logo & SEO
            </a>{" "}
            sayfasındaki Google doğrulama kodunu kullanın.
          </li>
          <li>
            Merchant Center&apos;da &quot;Ürün sayfalarında kalite kontrolü yapılamıyor&quot; uyarısı
            görürseniz: feed URL&apos;leri <code>www.anatolianpaw.com</code> ile eşleşmeli;{" "}
            <a href="/robots.txt" target="_blank" rel="noreferrer" className="underline">
              robots.txt
            </a>{" "}
            Googlebot ve Googlebot-Image için ürün görsellerine (<code>/api/media/</code>) izin vermeli.
            Düzeltmeden sonra Merchant Center → Ürünler → sorunlu ürün → <strong>Yeniden kontrol et</strong>.
          </li>
        </ol>
        <p className="text-xs text-zinc-500">
          Feed formatı:{" "}
          <a
            href="https://support.google.com/merchants/answer/14987622"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Google RSS 2.0 spesifikasyonu
          </a>
          . Zorunlu alanlar: id, title, description, link, image_link, price, availability, condition,
          brand.
        </p>
      </section>

      <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>
        Kaydet
      </button>
      {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}
    </div>
  );
}
