"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cropImageToBlob,
  loadImageFromFile,
  releaseImageObjectUrl,
  viewportToCropRect,
  type CropRect,
} from "@/lib/image-crop";

export function ImageCropModal({
  file,
  aspectRatio,
  outputWidth,
  outputHeight,
  title,
  onDone,
  onCancel,
}: {
  file: File;
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
  title: string;
  onDone: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const viewRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isPortrait = outputHeight > outputWidth;

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    setImg(null);
    void loadImageFromFile(file)
      .then((loaded) => {
        if (cancelled) {
          releaseImageObjectUrl(loaded);
          return;
        }
        setImg(loaded);
        const viewW = isPortrait ? 280 : 360;
        const frameH = isPortrait ? 360 : viewW / aspectRatio;
        const frameW = isPortrait ? frameH * aspectRatio : viewW * 0.88;
        const fit =
          Math.max(
            frameW / loaded.naturalWidth,
            frameH / loaded.naturalHeight,
          ) * 1.05;
        setScale(fit);
        setOffset({ x: 0, y: 0 });
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Görsel okunamadı");
      });
    return () => {
      cancelled = true;
      setImg((prev) => {
        releaseImageObjectUrl(prev);
        return null;
      });
    };
  }, [file, aspectRatio, isPortrait]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!img) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    },
    [img, offset],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setOffset({
        x: dragStart.current.ox + (e.clientX - dragStart.current.x),
        y: dragStart.current.oy + (e.clientY - dragStart.current.y),
      });
    },
    [dragging],
  );

  const onPointerUp = useCallback(() => setDragging(false), []);

  async function confirm() {
    if (!img || !viewRef.current) return;
    setBusy(true);
    setErr(null);
    try {
      const viewW = viewRef.current.clientWidth;
      const viewH = viewRef.current.clientHeight;
      const crop: CropRect = viewportToCropRect(
        img.naturalWidth,
        img.naturalHeight,
        viewW,
        viewH,
        scale,
        offset.x,
        offset.y,
        aspectRatio,
      );
      const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await cropImageToBlob(img, crop, {
        width: outputWidth,
        height: outputHeight,
        mime,
      });
      releaseImageObjectUrl(img);
      setImg(null);
      onDone(blob);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kırpma hatası");
    } finally {
      setBusy(false);
    }
  }

  const frameStyle = isPortrait
    ? ({
        aspectRatio: `${outputWidth} / ${outputHeight}`,
        height: "90%",
        width: "auto",
        maxWidth: "72%",
      } as const)
    : ({
        aspectRatio: `${outputWidth} / ${outputHeight}`,
        width: "88%",
        maxWidth: "100%",
      } as const);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Sürükleyerek konumlandırın, kaydırıcı ile yakınlaştırın. Çıktı: {outputWidth}×{outputHeight}px
        </p>

        <div
          ref={viewRef}
          className={`relative mt-4 w-full overflow-hidden rounded-lg touch-none select-none ${
            isPortrait ? "h-[26rem]" : "h-64"
          }`}
          style={{
            backgroundColor: "#18181b",
            backgroundImage:
              "linear-gradient(45deg,#27272a 25%,transparent 25%),linear-gradient(-45deg,#27272a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#27272a 75%),linear-gradient(-45deg,transparent 75%,#27272a 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{
                width: img.naturalWidth * scale,
                height: img.naturalHeight * scale,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-zinc-400">Yükleniyor…</p>
          )}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
            style={frameStyle}
          />
        </div>

        <label className="mt-3 block text-xs text-zinc-600">
          Yakınlaştır
          <input
            type="range"
            min={0.2}
            max={4}
            step={0.02}
            value={scale}
            className="mt-1 w-full"
            onChange={(e) => setScale(parseFloat(e.target.value))}
          />
        </label>

        {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100" onClick={onCancel}>
            İptal
          </button>
          <button
            type="button"
            className="rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!img || busy}
            onClick={() => void confirm()}
          >
            {busy ? "Hazırlanıyor…" : "Kırp ve yükle"}
          </button>
        </div>
      </div>
    </div>
  );
}
