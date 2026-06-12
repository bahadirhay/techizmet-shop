"use client";

import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { VideoUploadField } from "@/components/admin/VideoUploadField";
import { btnSecondary, inputClass } from "@/components/admin/AdminForm";
import type { ProductMediaItem } from "@/lib/product-media";

function mediaSrc(url: string) {
  return url.startsWith("/") || url.startsWith("http") ? url : `/${url}`;
}

export function ProductMediaEditor({
  items,
  onChange,
}: {
  items: ProductMediaItem[];
  onChange: (items: ProductMediaItem[]) => void;
}) {
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  function addItem(item: ProductMediaItem) {
    if (items.some((m) => m.url === item.url)) return;
    onChange([...items, item]);
  }

  const firstImageIdx = items.findIndex((m) => m.mediaType === "image");

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
      <div>
        <p className="text-sm font-semibold text-zinc-800">
          Ürün görselleri & videolar{" "}
          <span className="font-normal text-zinc-500">({items.length} medya)</span>
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          İlk görsel vitrin/liste ana görselidir. Videolar ürün detay galerisinde oynatılır.{" "}
          <a
            href="/admin/settings/image-guide"
            className="text-[var(--kn-brand)] hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Görsel boyutları kılavuzu →
          </a>
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">Henüz medya yok.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li
              key={`${item.url}-${i}`}
              className="flex flex-wrap items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                {item.mediaType === "video" ? (
                  <video
                    src={mediaSrc(item.url)}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaSrc(item.url)}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.classList.add("opacity-40");
                    }}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      item.mediaType === "video"
                        ? "bg-violet-100 text-violet-800"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {item.mediaType === "video" ? "Video" : "Görsel"}
                  </span>
                  {item.mediaType === "image" && i === firstImageIdx ? (
                    <span className="rounded bg-[var(--kn-brand)]/10 px-2 py-0.5 text-xs text-[var(--kn-brand)]">
                      Ana görsel
                    </span>
                  ) : item.mediaType === "image" ? (
                    <button
                      type="button"
                      className="text-xs text-[var(--kn-brand)] hover:underline"
                      onClick={() => {
                        const next = [...items];
                        const [img] = next.splice(i, 1);
                        const videoPart = next.filter((m) => m.mediaType === "video");
                        const restImages = next.filter((m) => m.mediaType === "image");
                        onChange([img, ...restImages, ...videoPart]);
                      }}
                    >
                      Ana yap
                    </button>
                  ) : null}
                </div>
                <input
                  className={inputClass}
                  value={item.url}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...item, url: e.target.value };
                    onChange(next);
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnSecondary} disabled={i === 0} onClick={() => move(i, -1)}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:underline"
                    onClick={() => onChange(items.filter((_, j) => j !== i))}
                  >
                    Kaldır
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ImageUploadField
        label="Görsel ekle"
        hint="Sürükle-bırak veya seçin; 2:3 dikey kırpma (1200×1800) vitrin düzenini korur."
        aspectRatio={2 / 3}
        outputWidth={1200}
        outputHeight={1800}
        value=""
        onChange={(url) => {
          if (url) addItem({ url, mediaType: "image" });
        }}
      />

      <VideoUploadField
        onUploaded={(url) => addItem({ url, mediaType: "video" })}
        onUrlAdd={(url) => addItem({ url, mediaType: "video" })}
      />
    </div>
  );
}
