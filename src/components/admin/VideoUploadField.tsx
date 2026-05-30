"use client";

import { useCallback, useRef, useState } from "react";
import { btnSecondary, inputClass } from "@/components/admin/AdminForm";

async function uploadVideo(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
  const json = (await res.json()) as { error?: string; media?: { url: string } };
  if (!res.ok) throw new Error(json.error ?? "Yükleme başarısız");
  if (!json.media?.url) throw new Error("Yükleme başarısız");
  return json.media.url;
}

export function VideoUploadField({
  onUploaded,
  onUrlAdd,
}: {
  onUploaded: (url: string) => void;
  onUrlAdd: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) {
        setErr("Yalnızca video dosyası seçin (MP4, WebM, MOV)");
        return;
      }
      setBusy(true);
      setErr(null);
      try {
        const url = await uploadVideo(file);
        onUploaded(url);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Yükleme hatası");
      } finally {
        setBusy(false);
      }
    },
    [onUploaded],
  );

  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 space-y-3">
      <p className="text-sm font-medium text-zinc-800">Video ekle</p>
      <p className="text-xs text-zinc-500">MP4 / WebM / MOV — en fazla 80 MB. Veya doğrudan video URL yapıştırın.</p>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnSecondary}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Yükleniyor…" : "Video dosyası seç"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className={`${inputClass} min-w-0 flex-1`}
          placeholder="https://…/video.mp4 veya /uploads/…"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
        />
        <button
          type="button"
          className={btnSecondary}
          onClick={() => {
            const u = urlInput.trim();
            if (!u) return;
            onUrlAdd(u);
            setUrlInput("");
          }}
        >
          URL ekle
        </button>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
    </div>
  );
}
