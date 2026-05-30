"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

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
      googleAnalyticsId: string;
      facebookPixelId: string;
      robotsIndex: boolean;
      extraHeadHtml: string;
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
    const res = await fetch("/api/admin/settings/seo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branding, seo }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setMsg(j.error ?? "Kaydedilemedi");
      return;
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
          aspectRatio={3}
          outputWidth={480}
          outputHeight={160}
          hint="Sürükle-bırak veya seçin; kırpma penceresinde konumlandırın. Geniş logo (≈3:1)."
        />
        <ImageUploadField
          label="Logo (açık / şeffaf header)"
          value={branding.logoUrlLight}
          onChange={(url) => setBranding((b) => ({ ...b, logoUrlLight: url }))}
          aspectRatio={3}
          outputWidth={480}
          outputHeight={160}
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
        </p>
      </section>

      <section className="admin-card admin-card-pad space-y-4">
        <h2 className="text-lg font-semibold">İzleme & piksel</h2>
        <AdminField label="Google Analytics (G-XXXXXXXX)">
          <input
            className={inputClass}
            value={seo.googleAnalyticsId}
            onChange={(e) => setSeo((s) => ({ ...s, googleAnalyticsId: e.target.value }))}
          />
        </AdminField>
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
      </section>

      {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}
      <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>
        {busy ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </div>
  );
}
