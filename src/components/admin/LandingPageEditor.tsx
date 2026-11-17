"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LandingFields = {
  heading: string;
  heroLead: string;
  intro: string[];
  ctaLabel: string;
  heroImageUrl: string;
};

type Payload = {
  slug: string;
  route: string;
  defaults: LandingFields;
  effective: LandingFields;
};

export function LandingPageEditor({ slug }: { slug: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [heading, setHeading] = useState("");
  const [heroLead, setHeroLead] = useState("");
  const [introText, setIntroText] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      const res = await fetch(`/api/admin/landing-pages/${encodeURIComponent(slug)}`);
      const json = (await res.json()) as Payload & { error?: string };
      if (!res.ok) {
        if (!cancelled) setError(json.error ?? "Yüklenemedi");
        return;
      }
      if (cancelled) return;
      setData(json);
      setHeading(json.effective.heading);
      setHeroLead(json.effective.heroLead);
      setIntroText(json.effective.intro.join("\n\n"));
      setCtaLabel(json.effective.ctaLabel);
      setHeroImageUrl(json.effective.heroImageUrl);
    })().catch(() => {
      if (!cancelled) setError("Yüklenemedi");
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function save() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const intro = introText
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      const res = await fetch(`/api/admin/landing-pages/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heading,
          heroLead,
          intro,
          ctaLabel,
          heroImageUrl,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Kayıt başarısız");
        return;
      }
      setMessage("Kaydedildi. Vitrini yenileyerek kontrol edin.");
    } catch {
      setError("Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function resetToDefaults() {
    if (!data) return;
    setHeading(data.defaults.heading);
    setHeroLead(data.defaults.heroLead);
    setIntroText(data.defaults.intro.join("\n\n"));
    setCtaLabel(data.defaults.ctaLabel);
    setHeroImageUrl(data.defaults.heroImageUrl);
  }

  if (error && !data) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-zinc-500">Yükleniyor…</p>;
  }

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-zinc-600">
        Canlı sayfa:{" "}
        <a href={data.route} target="_blank" rel="noreferrer" className="underline">
          {data.route} ↗
        </a>
        . Boş bırakılan alanlar kod varsayılanına döner.
      </p>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Başlık (H1)</span>
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Hero tek cümle</span>
        <textarea
          className="min-h-[88px] w-full rounded-lg border px-3 py-2 text-sm"
          value={heroLead}
          onChange={(e) => setHeroLead(e.target.value)}
        />
        <span className="text-xs text-zinc-500">
          Doluysa sayfa marketplace ızgarası yerine marka hero ile açılır.
        </span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Giriş metni (paragraflar)</span>
        <textarea
          className="min-h-[140px] w-full rounded-lg border px-3 py-2 text-sm"
          value={introText}
          onChange={(e) => setIntroText(e.target.value)}
        />
        <span className="text-xs text-zinc-500">Paragrafları boş satırla ayırın.</span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">CTA buton metni</span>
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={ctaLabel}
          onChange={(e) => setCtaLabel(e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Hero görsel URL (opsiyonel)</span>
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={heroImageUrl}
          onChange={(e) => setHeroImageUrl(e.target.value)}
          placeholder="Boş = ilk ürün görseli"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void resetToDefaults()}
          className="rounded-lg border px-4 py-2 text-sm text-zinc-700"
        >
          Varsayılana doldur
        </button>
        <Link href="/admin/pages#seo-landings" className="text-sm text-zinc-600 underline">
          ← Sayfalar listesi
        </Link>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
