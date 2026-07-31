"use client";

import { MirrorImageField } from "@/components/admin/MirrorImageField";
import type { MirrorElementEdit } from "@/lib/mirror-element-edits";
import { pageBannerElementId } from "@/lib/mirror-element-edits";

export function MirrorPageBannerPanel({
  sectionKey,
  sectionLabel,
  elements,
  onChange,
}: {
  sectionKey: string;
  sectionLabel: string;
  elements: Record<string, MirrorElementEdit> | undefined;
  onChange: (edit: MirrorElementEdit) => void;
}) {
  const titleId = pageBannerElementId(sectionKey, "title");
  const descId = pageBannerElementId(sectionKey, "desc");
  const imageId = pageBannerElementId(sectionKey, "image");

  const title = elements?.[titleId]?.text ?? "";
  const desc = elements?.[descId]?.text ?? "";
  const imageUrl = elements?.[imageId]?.imageUrl ?? "";

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-sky-400">Sayfa banner — {sectionLabel}</p>
      <p className="text-xs text-zinc-500">
        Önizlemede başlığa/açıklamaya tıklayın veya aşağıdan düzenleyin. Arka plan görseli için banner
        görseline tıklayın.
      </p>

      <label className="block text-xs text-zinc-400">
        Başlık
        <input
          type="text"
          className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          value={title}
          placeholder="Koleksiyonlarımız"
          onChange={(e) => onChange({ id: titleId, kind: "text", text: e.target.value })}
        />
      </label>

      <label className="block text-xs text-zinc-400">
        Açıklama
        <textarea
          className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          rows={4}
          value={desc}
          onChange={(e) => onChange({ id: descId, kind: "text", text: e.target.value })}
        />
      </label>

      <MirrorImageField
        label="Arka plan görseli"
        value={imageUrl}
        onChange={(url) => onChange({ id: imageId, kind: "image", imageUrl: url })}
      />
    </div>
  );
}
