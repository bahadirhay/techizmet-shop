"use client";

import { ImageUploadField, type ImageUploadFieldProps } from "@/components/admin/ImageUploadField";

/** Vitrin / sayfa editörü — önizleme + sürükle-bırak + dosya seç */
export function MirrorImageField(
  props: Omit<ImageUploadFieldProps, "editorChrome"> & { editorChrome?: boolean },
) {
  return <ImageUploadField editorChrome hideUrlInput={false} maxEdgePx={2400} {...props} />;
}
