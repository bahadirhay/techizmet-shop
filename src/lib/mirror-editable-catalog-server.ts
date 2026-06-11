import "server-only";

import type { EditableFieldDef } from "@/lib/mirror-editable-catalog";
import { applyMirrorTrReplacements } from "@/lib/mirror-html-locale";
import type { ShopLocale } from "@/lib/i18n/locale";

function isHeadingDefaultField(id: string): boolean {
  return (
    /--section--heading--\d+$/.test(id) ||
    /--section-heading--\d+$/.test(id) ||
    /--media-content-heading--\d+$/.test(id) ||
    /--image-with-text--heading--\d+$/.test(id)
  );
}

/** Admin panelinde varsayılan başlıkları TR göster (client'a büyük sözlük gömülmesin) */
export function localizeEditableCatalogDefaults(
  catalog: Record<string, EditableFieldDef[]>,
  locale: ShopLocale,
): Record<string, EditableFieldDef[]> {
  if (locale !== "tr") return catalog;
  const out: Record<string, EditableFieldDef[]> = {};
  for (const [sectionKey, fields] of Object.entries(catalog)) {
    out[sectionKey] = fields.map((field) => {
      if (field.kind !== "html" || !isHeadingDefaultField(field.id)) return field;
      return {
        ...field,
        defaultValue: applyMirrorTrReplacements(field.defaultValue),
      };
    });
  }
  return out;
}
