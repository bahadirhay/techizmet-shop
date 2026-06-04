"use client";

import { useState, type ReactNode } from "react";
import { ProductExploreEditor } from "@/components/admin/ProductExploreEditor";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";
import {
  DEFAULT_PRODUCT_MARQUEE_PLAIN_TR,
  DEFAULT_REVEALING_TEXT_PLAIN_TR,
  DEFAULT_VIDEO_DESCRIPTION_PLAIN_TR,
  DEFAULT_VIDEO_HEADING_PLAIN_TR,
  productBodyHtmlToPlain,
  productBodyPlainToHtml,
  productMarqueeHtmlToPlain,
  productMarqueePlainToHtml,
  productVideoHeadingHtmlToPlain,
  productVideoHeadingPlainToHtml,
  type ProductPageBottomSettings,
} from "@/lib/product-page-bottom";
import type { ProductExploreLook } from "@/lib/product-explore-looks";

type ProductOpt = { slug: string; title: string };

const ACCENT_HINT = "Vurgulanacak kısmı yıldız içine alın: örn. En çok satanlarda *%40 indirim*";

function SectionToggle({
  label,
  hint,
  enabled,
  onEnabledChange,
  children,
}: {
  label: string;
  hint?: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        <span>
          <span className="text-sm font-semibold text-zinc-800">{label}</span>
          {hint ? <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span> : null}
        </span>
      </label>
      {enabled ? children : (
        <p className="text-xs text-zinc-500 italic pl-7">Vitrinde bu bölüm gizlenir.</p>
      )}
    </div>
  );
}

function bottomToPlainDraft(initial: ProductPageBottomSettings) {
  return {
    marquee: productMarqueeHtmlToPlain(initial.marquee.html),
    revealing: productBodyHtmlToPlain(initial.revealingText.html),
    videoHeading: productVideoHeadingHtmlToPlain(initial.videoPromo.headingHtml),
    videoDescription: productBodyHtmlToPlain(initial.videoPromo.descriptionHtml),
  };
}

export function ProductExploreSettingsForm({
  initialLooks,
  initialPageBottom,
  productOptions,
}: {
  initialLooks: ProductExploreLook[];
  initialPageBottom: ProductPageBottomSettings;
  productOptions: ProductOpt[];
}) {
  const [looks, setLooks] = useState<ProductExploreLook[]>(() => [...initialLooks]);
  const [plain, setPlain] = useState(() => bottomToPlainDraft(initialPageBottom));
  const [bottom, setBottom] = useState<ProductPageBottomSettings>(() => ({
    marquee: { ...initialPageBottom.marquee },
    revealingText: { ...initialPageBottom.revealingText },
    videoPromo: { ...initialPageBottom.videoPromo },
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function syncPlainToBottom(nextPlain: typeof plain) {
    setBottom({
      marquee: {
        ...bottom.marquee,
        html: productMarqueePlainToHtml(nextPlain.marquee),
      },
      revealingText: {
        ...bottom.revealingText,
        html: productBodyPlainToHtml(nextPlain.revealing),
      },
      videoPromo: {
        ...bottom.videoPromo,
        headingHtml: productVideoHeadingPlainToHtml(nextPlain.videoHeading),
        descriptionHtml: productBodyPlainToHtml(nextPlain.videoDescription),
      },
    });
  }

  function updatePlain(patch: Partial<typeof plain>) {
    const next = { ...plain, ...patch };
    setPlain(next);
    syncPlainToBottom(next);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    setOk(false);
    const cleaned = looks
      .filter((l) => l.imageUrl.trim())
      .map((l) => ({
        ...l,
        productSlugs: l.productSlugs.filter(Boolean),
      }));
    const pageBottom: ProductPageBottomSettings = {
      marquee: {
        enabled: bottom.marquee.enabled,
        html: productMarqueePlainToHtml(plain.marquee),
      },
      revealingText: {
        enabled: bottom.revealingText.enabled,
        html: productBodyPlainToHtml(plain.revealing),
      },
      videoPromo: {
        enabled: bottom.videoPromo.enabled,
        headingHtml: productVideoHeadingPlainToHtml(plain.videoHeading),
        descriptionHtml: productBodyPlainToHtml(plain.videoDescription),
      },
    };
    const res = await fetch("/api/admin/settings/product-explore", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ looks: cleaned, pageBottom }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Kayıt başarısız");
      return;
    }
    setOk(true);
    setLooks(cleaned);
    setBottom(pageBottom);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SectionToggle
        label="Kayan kampanya yazısı"
        hint="Ana sayfa ve tüm ürün detay sayfalarında üstteki kayan şerit. Tekrarlı görünüm normaldir."
        enabled={bottom.marquee.enabled}
        onEnabledChange={(enabled) => setBottom((b) => ({ ...b, marquee: { ...b.marquee, enabled } }))}
      >
        <AdminField label="Metin" hint={ACCENT_HINT}>
          <input
            className={inputClass}
            value={plain.marquee}
            onChange={(e) => updatePlain({ marquee: e.target.value })}
            placeholder={DEFAULT_PRODUCT_MARQUEE_PLAIN_TR}
          />
        </AdminField>
      </SectionToggle>

      <ProductExploreEditor
        variant="site"
        looks={looks}
        onLooksChange={setLooks}
        productOptions={productOptions}
      />

      <SectionToggle
        label="Açılış metni (büyük paragraf)"
        hint="Keşfet altında, arka plan görselli uzun metin. Düz metin; satır sonu için Enter."
        enabled={bottom.revealingText.enabled}
        onEnabledChange={(enabled) =>
          setBottom((b) => ({ ...b, revealingText: { ...b.revealingText, enabled } }))
        }
      >
        <AdminField label="Metin">
          <textarea
            className={inputClass}
            rows={4}
            value={plain.revealing}
            onChange={(e) => updatePlain({ revealing: e.target.value })}
            placeholder={DEFAULT_REVEALING_TEXT_PLAIN_TR}
          />
        </AdminField>
      </SectionToggle>

      <SectionToggle
        label="Video üstü başlık ve açıklama"
        hint="Arka planda video oynayan bölümdeki başlık ve alt metin. Videoyu kapatmak için bölümü pasif yapın."
        enabled={bottom.videoPromo.enabled}
        onEnabledChange={(enabled) =>
          setBottom((b) => ({ ...b, videoPromo: { ...b.videoPromo, enabled } }))
        }
      >
        <AdminField label="Başlık" hint={ACCENT_HINT}>
          <input
            className={inputClass}
            value={plain.videoHeading}
            onChange={(e) => updatePlain({ videoHeading: e.target.value })}
            placeholder={DEFAULT_VIDEO_HEADING_PLAIN_TR}
          />
        </AdminField>
        <AdminField label="Açıklama">
          <textarea
            className={inputClass}
            rows={3}
            value={plain.videoDescription}
            onChange={(e) => updatePlain({ videoDescription: e.target.value })}
            placeholder={DEFAULT_VIDEO_DESCRIPTION_PLAIN_TR}
          />
        </AdminField>
      </SectionToggle>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {ok ? (
        <p className="text-sm text-emerald-700">
          Kaydedildi. Ürün sayfalarını yenileyerek kontrol edin.
        </p>
      ) : null}
      <button type="button" className={btnPrimary} disabled={busy} onClick={save}>
        {busy ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </div>
  );
}
