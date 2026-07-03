"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import type { SiteSettings } from "@/lib/site-settings";
import {
  THEME_COLOR_FIELDS,
  type ThemeColorsSettings,
} from "@/lib/theme-colors";

export function ThemeColorsForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [colors, setColors] = useState<ThemeColorsSettings>(initial.theme?.themeColors ?? {});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function setColor(key: keyof ThemeColorsSettings, value: string) {
    setColors((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const cleaned: ThemeColorsSettings = {};
    for (const field of THEME_COLOR_FIELDS) {
      const v = colors[field.key]?.trim();
      if (v) cleaned[field.key] = v;
    }
    const payload: SiteSettings = {
      ...initial,
      theme: { ...initial.theme, themeColors: cleaned },
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

  function resetAll() {
    setColors({});
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-600">
        Renk kutusunu boş bırakırsanız temanın varsayılan rengi kullanılır. Değişiklik yalnızca
        yeni React vitrin kabuğundaki sayfalarda geçerlidir.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {THEME_COLOR_FIELDS.map((field) => {
          const value = colors[field.key]?.trim() ?? "";
          const swatch = value || field.fallback;
          return (
            <div key={field.key} className="rounded-lg border border-zinc-200 p-3">
              <label className="mb-2 block text-sm font-medium text-zinc-800">{field.label}</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={/^#([0-9a-fA-F]{6})$/.test(swatch) ? swatch : field.fallback}
                  onChange={(e) => setColor(field.key, e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-zinc-300 bg-white p-0.5"
                  aria-label={`${field.label} renk seçici`}
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setColor(field.key, e.target.value)}
                  placeholder={`${field.fallback} (varsayılan)`}
                  className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                />
                {value ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs text-zinc-500 underline"
                    onClick={() => setColor(field.key, "")}
                  >
                    Sıfırla
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className={btnPrimary} disabled={busy} onClick={save}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button type="button" className={btnSecondary} disabled={busy} onClick={resetAll}>
          Tümünü varsayılana döndür
        </button>
        {msg ? <span className="text-sm text-zinc-600">{msg}</span> : null}
      </div>
    </div>
  );
}
