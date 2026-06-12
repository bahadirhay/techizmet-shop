"use client";

import { toVideoIframeSrc } from "@/lib/video-embed";

export function ProductMediaEmbedPreview({ url }: { url: string }) {
  const embedSrc = toVideoIframeSrc(url);
  if (!embedSrc) return null;

  return (
    <iframe
      src={embedSrc}
      title="Video önizleme"
      className="h-full w-full border-0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      loading="lazy"
    />
  );
}
