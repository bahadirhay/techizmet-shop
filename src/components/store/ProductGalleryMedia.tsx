import {
  isEmbeddableProductVideoUrl,
  productGalleryMainVideoInnerHtml,
} from "@/lib/product-gallery-media";
import { resolvePublicMediaUrl } from "@/lib/product-media";

export function ProductGalleryMedia({
  url,
  mediaType,
  alt,
  priority,
}: {
  url: string;
  mediaType: string;
  alt: string;
  priority?: boolean;
}) {
  if (mediaType === "video") {
    if (isEmbeddableProductVideoUrl(url)) {
      return (
        <div
          className="kn-pdp__gallery-embed-wrap kn-product-gallery-embed-host"
          style={{ ["--image_ratio" as string]: "150%" }}
          dangerouslySetInnerHTML={{
            __html: productGalleryMainVideoInnerHtml(url, alt),
          }}
        />
      );
    }
    return (
      <video
        src={resolvePublicMediaUrl(url)}
        controls
        playsInline
        muted
        loop
        className="kn-pdp__gallery-video"
        preload="metadata"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvePublicMediaUrl(url)}
      alt={alt}
      className="kn-pdp__img"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
