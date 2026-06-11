"use client";

import { useCallback, useRef, useState } from "react";
import { ImageCropModal } from "@/components/admin/ImageCropModal";
import {
  loadImageFromFile,
  prepareLogoImageBlob,
  releaseImageObjectUrl,
  resizeImageToBlob,
} from "@/lib/image-crop";

export type ImageUploadFieldProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  /** Koyu sayfa editörü paneli */
  editorChrome?: boolean;
  /** Kırpma çerçevesi en-boy (ör. 1 = kare favicon, 3 = geniş logo) */
  aspectRatio?: number;
  /** Yükleme sonrası çıktı genişliği (kırpma açılır) */
  outputWidth?: number;
  /** Yükleme sonrası çıktı yüksekliği */
  outputHeight?: number;
  /** Kırpma yok; uzun kenar bu pikseli geçmez */
  maxEdgePx?: number;
  /** Logo modu — oran korunur, boş kenarlar kırpılır, 3:1 zorlaması yok */
  logoFit?: { maxWidth: number; maxHeight: number; trim?: boolean };
  /** URL alanını gizle (yalnızca yükle) */
  hideUrlInput?: boolean;
};

async function uploadBlob(blob: Blob, filename: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", new File([blob], filename, { type: blob.type }));
  const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
  const json = (await res.json()) as { error?: string; media?: { url: string } };
  if (!res.ok) throw new Error(json.error ?? "Yükleme başarısız");
  if (!json.media?.url) throw new Error("Yükleme başarısız");
  return json.media.url;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  hint,
  editorChrome,
  aspectRatio,
  outputWidth,
  outputHeight,
  maxEdgePx = 2000,
  logoFit,
  hideUrlInput = false,
}: ImageUploadFieldProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const needsCrop = Boolean(aspectRatio && outputWidth && outputHeight);

  const uploadProcessed = useCallback(
    async (blob: Blob, name: string) => {
      setBusy(true);
      setErr(null);
      try {
        const url = await uploadBlob(blob, name);
        onChange(url);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Yükleme hatası");
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  async function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setErr("Yalnızca görsel dosyası seçin");
      return;
    }
    if (file.type === "image/svg+xml") {
      setBusy(true);
      setErr(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
        const json = (await res.json()) as { error?: string; media?: { url: string } };
        if (!res.ok || !json.media?.url) throw new Error(json.error ?? "Yükleme başarısız");
        onChange(json.media.url);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Yükleme hatası");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (needsCrop && !logoFit) {
      setCropFile(file);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const img = await loadImageFromFile(file);
      try {
        const blob = logoFit
          ? await prepareLogoImageBlob(img, {
              maxWidth: logoFit.maxWidth,
              maxHeight: logoFit.maxHeight,
              trim: logoFit.trim !== false,
              mime: file.type === "image/jpeg" ? "image/jpeg" : "image/png",
            })
          : await resizeImageToBlob(
              img,
              maxEdgePx,
              file.type === "image/png" ? "image/png" : "image/jpeg",
            );
        const ext = blob.type === "image/png" ? "png" : "jpg";
        await uploadProcessed(blob, logoFit ? `logo.${ext}` : `image.${ext}`);
      } finally {
        releaseImageObjectUrl(img);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "İşlem hatası");
      setBusy(false);
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void processFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  const labelCls = editorChrome ? "ed-img-label block" : "block text-sm font-medium text-zinc-700";
  const inputCls = editorChrome
    ? "ed-img-input w-full rounded-lg px-3 py-2 text-sm"
    : "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
  const mutedCls = editorChrome ? "text-xs" : "text-xs text-zinc-500";
  const mutedStyle = editorChrome ? { color: "var(--ed-muted, #a1a1aa)" } : undefined;

  const dropCls = editorChrome
    ? "ed-img-drop"
    : "media-drop-zone rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-4 text-center transition";

  return (
    <div className="space-y-2">
      <label className={labelCls}>{label}</label>

      {value ? (
        <div
          className="flex flex-col gap-2 sm:flex-row sm:items-start"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <button
            type="button"
            className={`group relative shrink-0 overflow-hidden rounded-lg border-2 border-dashed transition hover:border-emerald-500/60 ${
              dragOver ? "border-emerald-500" : editorChrome ? "border-zinc-600 bg-zinc-900" : "border-zinc-300 bg-zinc-100"
            }`}
            onClick={() => inputRef.current?.click()}
            title="Görseli değiştirmek için tıklayın veya sürükleyip bırakın"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className={`max-h-40 object-contain object-left ${logoFit ? "max-w-[min(100%,360px)]" : "max-w-[min(100%,280px)]"}`}
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = "0.35";
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              Değiştir
            </span>
          </button>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className={`text-left text-sm hover:underline ${editorChrome ? "text-emerald-400" : "text-emerald-700"}`}
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              Dosyadan seç
            </button>
            <button
              type="button"
              className={`text-left text-sm hover:underline ${editorChrome ? "text-red-400" : "text-red-600"}`}
              onClick={() => onChange("")}
            >
              Görseli kaldır
            </button>
          </div>
        </div>
      ) : null}

      {!value ? (
        <div
          className={`${dropCls}${dragOver ? " border-[var(--kn-brand)] bg-emerald-50/50" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <p className={`text-sm ${editorChrome ? "text-zinc-400" : "text-zinc-600"}`}>
            {busy ? "Yükleniyor…" : "Görseli buraya sürükleyin veya tıklayarak seçin"}
          </p>
          <button
            type="button"
            className="mt-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            Dosya seç
          </button>
          {needsCrop ? (
            <p className="mt-2 text-[11px] text-zinc-500">
              Yüklemeden önce kırpma penceresi açılır ({outputWidth}×{outputHeight}px)
            </p>
          ) : null}
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="sr-only"
        onChange={onFileInput}
      />

      {!hideUrlInput ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-zinc-500 hover:text-zinc-700">Gelişmiş: URL yapıştır</summary>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            className={`${inputCls} mt-2`}
          />
        </details>
      ) : null}

      {err ? <p className="text-xs text-red-500">{err}</p> : null}
      {hint ? (
        <p className={mutedCls} style={mutedStyle}>
          {hint}
        </p>
      ) : null}

      {cropFile && aspectRatio && outputWidth && outputHeight ? (
        <ImageCropModal
          file={cropFile}
          aspectRatio={aspectRatio}
          outputWidth={outputWidth}
          outputHeight={outputHeight}
          title={label}
          onCancel={() => setCropFile(null)}
          onDone={(blob) => {
            setCropFile(null);
            const ext = blob.type === "image/png" ? "png" : "jpg";
            void uploadProcessed(blob, `crop.${ext}`);
          }}
        />
      ) : null}
    </div>
  );
}
