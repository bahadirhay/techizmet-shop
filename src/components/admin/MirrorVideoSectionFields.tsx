"use client";

import { useState } from "react";
import { MirrorImageField } from "@/components/admin/MirrorImageField";
import { toVideoIframeSrc } from "@/lib/video-embed";
import type { VideoSectionData, VideoSectionEdit, VideoSourceType } from "@/lib/mirror-video-section";

const SOURCES: { id: VideoSourceType; label: string; hint: string }[] = [
  { id: "local", label: "Bilgisayardan (MP4)", hint: "Dosya yükleyin veya URL yapıştırın" },
  { id: "youtube", label: "YouTube", hint: "watch veya youtu.be linki" },
  { id: "instagram", label: "Instagram", hint: "Reel / gönderi linki" },
  { id: "vimeo", label: "Vimeo", hint: "vimeo.com/… linki" },
];

const inp = "mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100";

export function mergeVideoSectionEdit(
  defaults: VideoSectionData | undefined,
  saved: VideoSectionEdit | undefined,
): VideoSectionEdit {
  const base: VideoSectionEdit = defaults ?? {
    sourceType: "local",
    url: "",
    autoplay: true,
    muted: true,
    loop: true,
  };
  if (!saved) return { ...base };
  return {
    sourceType: saved.sourceType ?? base.sourceType,
    url: saved.url ?? base.url,
    posterUrl: saved.posterUrl ?? base.posterUrl,
    autoplay: saved.autoplay ?? base.autoplay,
    muted: saved.muted ?? base.muted,
    loop: saved.loop ?? base.loop,
  };
}

export function MirrorVideoSectionFields({
  value,
  onChange,
}: {
  value: VideoSectionEdit;
  onChange: (next: VideoSectionEdit) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const embedPreview =
    value.sourceType !== "local" ? toVideoIframeSrc(value.url) : null;

  function patch(p: Partial<VideoSectionEdit>) {
    onChange({ ...value, ...p });
  }

  function setSourceType(sourceType: VideoSourceType) {
    onChange({
      ...value,
      sourceType,
      url: sourceType === value.sourceType ? value.url : "",
    });
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/media/upload-video", {
        method: "POST",
        body: fd,
      });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !j.url) {
        setUploadErr(j.error ?? "Yükleme başarısız");
        return;
      }
      patch({ sourceType: "local", url: j.url });
    } catch {
      setUploadErr("Ağ hatası");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-4 space-y-4 border-t border-zinc-700 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-violet-400">Video kaynağı</p>

      <div className="grid grid-cols-2 gap-2">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
              value.sourceType === s.id
                ? "border-violet-500 bg-violet-950/50 text-violet-100"
                : "border-zinc-600 text-zinc-400 hover:border-zinc-500"
            }`}
            onClick={() => setSourceType(s.id)}
          >
            <span className="font-medium">{s.label}</span>
            <span className="mt-0.5 block text-[10px] opacity-80">{s.hint}</span>
          </button>
        ))}
      </div>

      {value.sourceType === "local" ? (
        <div className="space-y-3">
          <label className="block text-xs text-zinc-400">
            Video dosyası (MP4, en fazla 80 MB)
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="mt-1 block w-full text-sm text-zinc-300"
              disabled={uploading}
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {uploading ? <p className="text-xs text-zinc-500">Yükleniyor…</p> : null}
          {uploadErr ? <p className="text-xs text-red-400">{uploadErr}</p> : null}
          <label className="block text-xs text-zinc-400">
            veya video URL (yüklenen dosya)
            <input
              className={inp}
              placeholder="/uploads/shop/…/video.mp4"
              value={value.url}
              onChange={(e) => patch({ url: e.target.value })}
            />
          </label>
          <MirrorImageField
            label="Kapak görseli (isteğe bağlı)"
            value={value.posterUrl ?? ""}
            onChange={(url) => patch({ posterUrl: url || undefined })}
          />
        </div>
      ) : (
        <label className="block text-xs text-zinc-400">
          {value.sourceType === "youtube"
            ? "YouTube linki"
            : value.sourceType === "instagram"
              ? "Instagram linki"
              : "Vimeo linki"}
          <input
            className={inp}
            placeholder={
              value.sourceType === "youtube"
                ? "https://www.youtube.com/watch?v=…"
                : value.sourceType === "instagram"
                  ? "https://www.instagram.com/reel/…"
                  : "https://vimeo.com/…"
            }
            value={value.url}
            onChange={(e) => patch({ url: e.target.value })}
          />
          {value.url && !embedPreview ? (
            <p className="mt-1 text-xs text-amber-400">Link tanınmadı — tam paylaşım URL’sini yapıştırın.</p>
          ) : null}
          {embedPreview ? (
            <p className="mt-1 truncate text-[10px] text-zinc-600" title={embedPreview}>
              Önizleme: {embedPreview}
            </p>
          ) : null}
        </label>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-zinc-300">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.autoplay !== false}
            onChange={(e) => patch({ autoplay: e.target.checked })}
          />
          Otomatik oynat
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.muted !== false}
            onChange={(e) => patch({ muted: e.target.checked })}
          />
          Sessiz
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.loop !== false}
            onChange={(e) => patch({ loop: e.target.checked })}
          />
          Döngü
        </label>
      </div>
    </div>
  );
}
