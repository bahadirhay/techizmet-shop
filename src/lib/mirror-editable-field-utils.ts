/** İstemci güvenli — vitrin alan yardımcıları (fs yok) */

import type { EditableFieldDef } from "@/lib/mirror-editable-catalog";

/** Bölüm başlığı alanı (Müşteri Yorumları vb.) */
export function findSectionHeadingField(fields: EditableFieldDef[]): EditableFieldDef | undefined {
  return fields.find(
    (f) =>
      /--section--heading--\d+$/.test(f.id) ||
      /--section-heading--\d+$/.test(f.id) ||
      /--media-content-heading--\d+$/.test(f.id) ||
      /--image-with-text--heading--\d+$/.test(f.id),
  );
}
