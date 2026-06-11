"use client";

import { useState } from "react";
import { MirrorImageField } from "@/components/admin/MirrorImageField";
import { PlainHtmlTextarea } from "@/components/admin/PlainHtmlTextarea";
import type { MediaGridItemData, MediaGridItemEdit } from "@/lib/mirror-media-grid";
import { isComplexHtml } from "@/lib/html-plain-text";

export function mergeMediaGridEdits(
  defaults: MediaGridItemData[] | undefined,
  saved: MediaGridItemEdit[] | undefined,
): MediaGridItemEdit[] {
  const byId = new Map((saved ?? []).map((i) => [i.itemId, i]));
  if (!defaults?.length) return saved ?? [];
  return defaults.map((d) => ({ ...d, ...byId.get(d.itemId) }));
}

function MediaGridItemFields({
  item,
  index,
  onPatch,
}: {
  item: MediaGridItemEdit;
  index: number;
  onPatch: (patch: Partial<MediaGridItemEdit>) => void;
}) {
  const [tab, setTab] = useState<"tr" | "en">("tr");
  const isEn = tab === "en";

  return (
    <details
      key={item.itemId}
      className="rounded-lg border border-zinc-700 bg-zinc-950/80 p-3"
      open={index === 0}
    >
      <summary className="cursor-pointer text-sm font-medium text-zinc-200">
        Kart {index + 1}
        {item.headingHtml ? (
          <span className="ml-2 font-normal text-zinc-500">
            — {item.headingHtml.replace(/<[^>]+>/g, " ").trim().slice(0, 48)}
          </span>
        ) : null}
      </summary>
      <div className="mt-3 space-y-3">
        <MirrorImageField
          label="Kart görseli"
          value={item.imageUrl ?? ""}
          onChange={(url) => onPatch({ imageUrl: url || undefined })}
        />
        {/* TR / EN sekmeleri */}
        <div className="flex gap-1">
          {(["tr", "en"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                tab === t
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
              }`}
            >
              {t === "tr" ? "🇹🇷 TR" : "🇬🇧 EN"}
            </button>
          ))}
        </div>

        {/* Başlık */}
        {!isEn && isComplexHtml(item.headingHtml ?? "") ? (
          <label className="block text-xs text-zinc-400">
            Başlık 🇹🇷 (vurgulu HTML — gelişmiş)
            <textarea
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              rows={3}
              value={item.headingHtml ?? ""}
              onChange={(e) => onPatch({ headingHtml: e.target.value || undefined })}
            />
          </label>
        ) : !isEn ? (
          <PlainHtmlTextarea
            label="Başlık 🇹🇷"
            rows={2}
            valueHtml={item.headingHtml ?? ""}
            onChangeHtml={(html) => onPatch({ headingHtml: html || undefined })}
          />
        ) : (
          <label className="block text-xs text-zinc-400">
            Başlık 🇬🇧 EN (boş = EN&apos;de TR başlığı gösterilmez)
            <textarea
              className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              rows={3}
              value={item.headingHtmlEn ?? ""}
              onChange={(e) => onPatch({ headingHtmlEn: e.target.value })}
            />
          </label>
        )}

        {/* Açıklama */}
        {!isEn ? (
          <PlainHtmlTextarea
            label="Açıklama metni 🇹🇷"
            rows={5}
            valueHtml={item.descriptionHtml ?? ""}
            onChangeHtml={(html) => onPatch({ descriptionHtml: html || undefined })}
          />
        ) : (
          <PlainHtmlTextarea
            label="Açıklama metni 🇬🇧 EN"
            rows={5}
            valueHtml={item.descriptionHtmlEn ?? ""}
            onChangeHtml={(html) => onPatch({ descriptionHtmlEn: html })}
          />
        )}

        {/* Buton yazısı */}
        <label className="block text-xs text-zinc-400">
          {isEn ? "Buton yazısı 🇬🇧 EN" : "Buton yazısı 🇹🇷 (ör. Keşfet)"}
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            placeholder={isEn ? "Discover" : "Keşfet"}
            value={isEn ? (item.buttonTextEn ?? "") : (item.buttonText ?? "")}
            onChange={(e) =>
              isEn
                ? onPatch({ buttonTextEn: e.target.value })
                : onPatch({ buttonText: e.target.value || undefined })
            }
          />
        </label>

        <label className="block text-xs text-zinc-400">
          Buton linki (tıklanınca gidilecek sayfa)
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            placeholder="/collections/glow-essentials"
            value={item.linkHref ?? ""}
            onChange={(e) => onPatch({ linkHref: e.target.value || undefined })}
          />
        </label>
      </div>
    </details>
  );
}

export function MediaGridSectionFields({
  items,
  onChange,
}: {
  items: MediaGridItemEdit[];
  onChange: (items: MediaGridItemEdit[]) => void;
}) {
  if (!items.length) {
    return (
      <p className="mt-3 text-xs text-zinc-500">
        Bu bölümde düzenlenebilir kart bulunamadı. <code>npm run theme:import</code> deneyin.
      </p>
    );
  }

  function patchItem(index: number, patch: Partial<MediaGridItemEdit>) {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    onChange(next);
  }

  return (
    <div className="mt-4 space-y-4 border-t border-zinc-700 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        Hero kartları ({items.length})
      </p>
      {items.map((item, index) => (
        <MediaGridItemFields
          key={item.itemId}
          item={item}
          index={index}
          onPatch={(patch) => patchItem(index, patch)}
        />
      ))}
    </div>
  );
}
