"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { SiteSeoAuditPanel } from "@/components/admin/SiteSeoAuditPanel";
import { extractUrls } from "@/lib/social-links";

export function StoreSeoSettingsForm({
  initial,
  siteUrl,
  siteName,
}: {
  initial: {
    branding: { logoUrl: string; logoUrlLight: string; faviconUrl: string };
    seo: {
      siteTitle: string;
      metaDescription: string;
      metaKeywords: string;
      ogImageUrl: string;
      googleSiteVerification: string;
      yandexVerification: string;
      bingVerification: string;
      pinterestDomainVerify: string;
      organizationName: string;
      organizationSameAs: string[];
      googleAnalyticsId: string;
      facebookPixelId: string;
      robotsIndex: boolean;
      extraHeadHtml: string;
      googleSwg: {
        enabled: boolean;
        isPartOfProductId: string;
        theme: "light" | "dark";
        lang: string;
      };
    };
  };
  siteUrl: string;
  siteName: string;
}) {
  const router = useRouter();
  const [branding, setBranding] = useState(initial.branding);
  const [seo, setSeo] = useState(initial.seo);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    // staticPages yalnızca vitrin sayfa editöründen yönetilir — form kaydında gönderilmez
    const { staticPages: _ignored, ...seoFields } = seo as typeof seo & {
      staticPages?: Record<string, unknown>;
    };
    seoFields.organizationSameAs = extractUrls(seoFields.organizationSameAs);
    const res = await fetch("/api/admin/settings/seo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branding, seo: seoFields }),
    });
    const j = (await res.json()) as {
      error?: string;
      branding?: { logoUrl?: string; logoUrlLight?: string; faviconUrl?: string };
    };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "Kaydedilemedi");
      return;
    }
    if (j.branding) {
      setBranding({
        logoUrl: j.branding.logoUrl?.trim() ?? "",
        logoUrlLight: j.branding.logoUrlLight?.trim() ?? "",
        faviconUrl: j.branding.faviconUrl?.trim() ?? "",
      });
    }
    setMsg("Kaydedildi.");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="admin-card admin-card-pad space-y-4">
        <h2 className="text-lg font-semibold">Marka & logo</h2>
        <p className="text-sm text-zinc-600">
          Vitrin sayfalarında (ana sayfa, koleksiyonlar, hakkımızda) header ve sekme simgesi bu alanlardan
          güncellenir. Önizleme vitrindeki <strong>güncel</strong> değerlerle doldurulmuştur.
        </p>
        <ImageUploadField
          label="Site logosu (koyu arka plan)"
          value={branding.logoUrl}
          onChange={(url) => setBranding((b) => ({ ...b, logoUrl: url }))}
          logoFit={{ maxWidth: 360, maxHeight: 96, trim: true }}
          hint="PNG önerilir. Boş kenarlar otomatik kırpılır; oran bozulmaz. Açık zeminli koyu logo yükleyin."
        />
        <ImageUploadField
          label="Logo (açık / şeffaf header)"
          value={branding.logoUrlLight}
          onChange={(url) => setBranding((b) => ({ ...b, logoUrlLight: url }))}
          logoFit={{ maxWidth: 360, maxHeight: 96, trim: true }}
          hint="Koyu veya şeffaf header için beyaz/açık renkli logo."
        />
        <ImageUploadField
          label="Favicon"
          value={branding.faviconUrl}
          onChange={(url) => setBranding((b) => ({ ...b, faviconUrl: url }))}
          aspectRatio={1}
          outputWidth={128}
          outputHeight={128}
          hint="Kare kırpma — sekme simgesi için 128×128 px"
        />
      </section>

      <section className="admin-card admin-card-pad space-y-4">
        <h2 className="text-lg font-semibold">Google SEO</h2>
        <p className="text-sm text-zinc-500">
          Varsayılan site adı: <strong>{siteName}</strong> (başlık boşsa kullanılır)
        </p>
        <AdminField label="Site başlığı">
          <input
            className={inputClass}
            value={seo.siteTitle}
            onChange={(e) => setSeo((s) => ({ ...s, siteTitle: e.target.value }))}
          />
        </AdminField>
        <AdminField label="Meta açıklama">
          <textarea
            className={inputClass}
            rows={3}
            value={seo.metaDescription}
            onChange={(e) => setSeo((s) => ({ ...s, metaDescription: e.target.value }))}
          />
        </AdminField>
        <AdminField label="Anahtar kelimeler (virgülle)">
          <input
            className={inputClass}
            value={seo.metaKeywords}
            onChange={(e) => setSeo((s) => ({ ...s, metaKeywords: e.target.value }))}
          />
        </AdminField>
        <ImageUploadField
          label="Paylaşım görseli (Open Graph)"
          value={seo.ogImageUrl}
          onChange={(url) => setSeo((s) => ({ ...s, ogImageUrl: url }))}
          aspectRatio={1200 / 630}
          outputWidth={1200}
          outputHeight={630}
          hint="Sosyal medya önizlemesi — 1200×630 önerilir"
        />
        <AdminField label="Google doğrulama kodu">
          <input
            className={inputClass}
            placeholder="google-site-verification=..."
            value={seo.googleSiteVerification}
            onChange={(e) => setSeo((s) => ({ ...s, googleSiteVerification: e.target.value }))}
          />
        </AdminField>
        <AdminField label="Yandex doğrulama kodu">
          <input
            className={inputClass}
            placeholder="yandex-verification"
            value={seo.yandexVerification}
            onChange={(e) => setSeo((s) => ({ ...s, yandexVerification: e.target.value }))}
          />
        </AdminField>
        <AdminField label="Bing doğrulama kodu (msvalidate.01)">
          <input
            className={inputClass}
            value={seo.bingVerification}
            onChange={(e) => setSeo((s) => ({ ...s, bingVerification: e.target.value }))}
          />
        </AdminField>
        <AdminField label="Pinterest doğrulama kodu (p:domain_verify)">
          <input
            className={inputClass}
            placeholder="df0ef7e09a6b04f7378c090f8adf4d33"
            value={seo.pinterestDomainVerify}
            onChange={(e) => setSeo((s) => ({ ...s, pinterestDomainVerify: e.target.value }))}
          />
        </AdminField>
        <AdminField label="Kuruluş adı (schema.org)">
          <input
            className={inputClass}
            value={seo.organizationName}
            onChange={(e) => setSeo((s) => ({ ...s, organizationName: e.target.value }))}
            placeholder={siteName}
          />
        </AdminField>
        <AdminField label="Resmi sosyal/profil bağlantıları (her satıra bir URL)">
          <textarea
            className={inputClass}
            rows={4}
            value={seo.organizationSameAs.join("\n")}
            onChange={(e) =>
              setSeo((s) => ({ ...s, organizationSameAs: e.target.value.split("\n") }))
            }
            placeholder={"https://www.instagram.com/markaniz\nhttps://www.facebook.com/markaniz\nhttps://www.youtube.com/@markaniz"}
          />
        </AdminField>
        <p className="text-xs text-zinc-500">
          Markanızın doğrulanmış sosyal medya/profil adresleri (schema.org <code>sameAs</code>). Google ve
          yapay zekâ aramalarında markanızı tek bir varlık olarak tanır; otorite (E-E-A-T) sinyalini güçlendirir.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={seo.robotsIndex}
            onChange={(e) => setSeo((s) => ({ ...s, robotsIndex: e.target.checked }))}
          />
          Arama motorlarında indekslensin (robots index)
        </label>
        <p className="text-sm text-zinc-500">
          Site haritası:{" "}
          <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="text-[var(--kn-brand)] underline">
            {siteUrl}/sitemap.xml
          </a>
          {" · "}
          <a href="/robots.txt" target="_blank" rel="noreferrer" className="text-[var(--kn-brand)] underline">
            robots.txt
          </a>
        </p>
      </section>

      <SiteSeoAuditPanel />

      <section className="admin-card admin-card-pad space-y-4">
        <h2 className="text-lg font-semibold">Google Haberler (blog)</h2>
        <p className="text-sm text-zinc-600">
          Subscribe with Google Basic etiketi yalnızca <strong>/blogs/news</strong> listesi ve blog yazı
          sayfalarına eklenir. Publisher Center başvurusu için RSS beslemesi:{" "}
          <a href="/blogs/news/feed.xml" target="_blank" rel="noreferrer" className="text-[var(--kn-brand)] underline">
            /blogs/news/feed.xml
          </a>
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={seo.googleSwg.enabled}
            onChange={(e) =>
              setSeo((s) => ({
                ...s,
                googleSwg: { ...s.googleSwg, enabled: e.target.checked },
              }))
            }
          />
          SWG Basic etiketini blog sayfalarında etkinleştir
        </label>
        <AdminField label="isPartOfProductId (Publisher Center)">
          <input
            className={inputClass}
            value={seo.googleSwg.isPartOfProductId}
            onChange={(e) =>
              setSeo((s) => ({
                ...s,
                googleSwg: { ...s.googleSwg, isPartOfProductId: e.target.value.trim() },
              }))
            }
            placeholder="CAow6d_LDA:openaccess"
          />
        </AdminField>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Tema">
            <select
              className={inputClass}
              value={seo.googleSwg.theme}
              onChange={(e) =>
                setSeo((s) => ({
                  ...s,
                  googleSwg: { ...s.googleSwg, theme: e.target.value as "light" | "dark" },
                }))
              }
            >
              <option value="light">Açık</option>
              <option value="dark">Koyu</option>
            </select>
          </AdminField>
          <AdminField label="Dil">
            <input
              className={inputClass}
              value={seo.googleSwg.lang}
              onChange={(e) =>
                setSeo((s) => ({
                  ...s,
                  googleSwg: { ...s.googleSwg, lang: e.target.value.trim() || "tr" },
                }))
              }
              placeholder="tr"
            />
          </AdminField>
        </div>
      </section>

      <section className="admin-card admin-card-pad space-y-4">
        <h2 className="text-lg font-semibold">İzleme & piksel</h2>
        <AdminField label="Google Analytics / Google etiketi (G-XXXXXXXX)">
          <input
            className={inputClass}
            value={seo.googleAnalyticsId}
            onChange={(e) => setSeo((s) => ({ ...s, googleAnalyticsId: e.target.value.trim() }))}
            placeholder="G-6KR5S6ZVKC"
          />
        </AdminField>
        <p className="text-xs text-zinc-500">
          Yalnızca kimliği girin (ör. <code>G-6KR5S6ZVKC</code>) — script kodunu yapıştırmayın. Etiket tüm
          sayfalara otomatik eklenir. KVKK için varsayılan olarak çerez onayı beklenir; Google kurulum testi
          etiketi yine de algılayabilir.
        </p>
        <AdminField label="Facebook Pixel ID">
          <input
            className={inputClass}
            value={seo.facebookPixelId}
            onChange={(e) => setSeo((s) => ({ ...s, facebookPixelId: e.target.value }))}
          />
        </AdminField>
        <AdminField label="Ek &lt;head&gt; HTML (isteğe bağlı)">
          <textarea
            className={`${inputClass} font-mono text-xs`}
            rows={4}
            value={seo.extraHeadHtml}
            onChange={(e) => setSeo((s) => ({ ...s, extraHeadHtml: e.target.value }))}
          />
        </AdminField>
        <p className="text-xs text-zinc-500">
          Yalnızca <code>meta</code> ve <code>link</code> etiketleri (doğrulama vb.). Script kodları buraya
          yapıştırılamaz; blog için Google Haberler bölümünü kullanın.
        </p>
      </section>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
        <p className="text-sm text-zinc-600">{msg ?? "Değişiklikleri kaydetmeyi unutmayın."}</p>
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
