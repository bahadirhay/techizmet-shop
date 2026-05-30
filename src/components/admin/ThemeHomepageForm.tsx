"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary } from "@/components/admin/AdminForm";
import type { HomepageMode, SiteSettings } from "@/lib/site-settings";

export function ThemeHomepageForm({
  initial,
  themeId,
}: {
  initial: SiteSettings;
  themeId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<HomepageMode>(
    initial.theme?.homepageMode === "blocks" ? "blocks" : "mirror",
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    const payload: SiteSettings = {
      ...initial,
      theme: { ...initial.theme, homepageMode: mode },
    };
    const res = await fetch("/api/admin/integrations/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    setMsg(res.ok ? "Kaydedildi. Vitrini yenileyin." : "Kayıt başarısız");
    if (res.ok) router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Ana sayfa vitrin tipi</h2>
        <p className="text-sm text-zinc-600">
          Aktif tema: <strong>{themeId}</strong>. Ana sayfa düzenleme:{" "}
          <strong>
            <a href="/admin/home" className="text-[var(--kn-brand,#2d4a6f)] underline">
              Admin → Ana Sayfa
            </a>
          </strong>{" "}
          (Techizmet Shop mirror, sürükle-bırak bölümler).
        </p>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[:checked]:border-[var(--kn-brand,#2d4a6f)] has-[:checked]:bg-zinc-50">
          <input
            type="radio"
            name="homepageMode"
            className="mt-1"
            checked={mode === "mirror"}
            onChange={() => setMode("mirror")}
          />
          <span>
            <strong>Techizmet Shop orijinal (önerilen)</strong>
            <br />
            <span className="text-sm text-zinc-500">
              <code>C:\My Web Sites\shop</code> mirror — duyuru, hero grid, koleksiyon sekmeleri, shop
              the look, marquee vb. Ürün linkleri mağaza rotalarına yönlendirilir.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[:checked]:border-[var(--kn-brand,#2d4a6f)] has-[:checked]:bg-zinc-50">
          <input
            type="radio"
            name="homepageMode"
            className="mt-1"
            checked={mode === "blocks"}
            onChange={() => setMode("blocks")}
          />
          <span>
            <strong>CMS blokları</strong>
            <br />
            <span className="text-sm text-zinc-500">
              Admin panelinden sürükle-bırak ile düzenlenen basitleştirilmiş vitrin (hero slider, ürün
              grid, bülten).
            </span>
          </span>
        </label>

        {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}
        <button type="button" className={btnPrimary} disabled={busy} onClick={save}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </section>

      <section className="rounded-xl border border-dashed bg-zinc-50 p-4 text-sm text-zinc-600">
        <p className="font-medium text-zinc-800">Mirror görselleri güncellemek</p>
        <p className="mt-1 font-mono text-xs">
          npm run theme:import
          <br />
          node scripts/build-mirror-home.mjs
        </p>
      </section>
    </div>
  );
}
