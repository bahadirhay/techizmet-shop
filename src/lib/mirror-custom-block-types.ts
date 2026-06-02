import { nanoid } from "nanoid";
import type { ShopBlock } from "@/lib/blocks/schema";
import { sanitizeShopBlocks } from "@/lib/blocks/schema";

/** Sayfa başı */
export const MIRROR_WIDGET_TOP = "__top__";

export type MirrorCustomBlockEntry = {
  id: string;
  block: ShopBlock;
  hidden?: boolean;
  /** Boş veya __top__ = ilk bölümden önce; aksi halde tema bölüm anahtarı */
  insertAfterSection?: string | null;
};

export type EditorMirrorCustomBlock = ShopBlock & {
  id: string;
  hidden?: boolean;
  insertAfterSection?: string;
};

export function normalizeMirrorCustomBlocks(raw: unknown): MirrorCustomBlockEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: MirrorCustomBlockEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (o.block && typeof o.block === "object") {
      const block = sanitizeShopBlocks([o.block])[0];
      if (!block) continue;
      out.push({
        id: typeof o.id === "string" && o.id.trim() ? o.id.trim().slice(0, 40) : nanoid(10),
        block,
        hidden: o.hidden === true,
        insertAfterSection: normalizeInsertAnchor(o.insertAfterSection),
      });
      continue;
    }
    const legacy = sanitizeShopBlocks([item])[0];
    if (!legacy) continue;
    out.push({
      id: nanoid(10),
      block: legacy,
      hidden: false,
      insertAfterSection: MIRROR_WIDGET_TOP,
    });
  }
  return out;
}

function normalizeInsertAnchor(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) return MIRROR_WIDGET_TOP;
  const t = v.trim().slice(0, 120);
  return t === MIRROR_WIDGET_TOP ? MIRROR_WIDGET_TOP : t;
}

export function toEditorMirrorCustomBlocks(
  entries?: MirrorCustomBlockEntry[] | ShopBlock[],
): EditorMirrorCustomBlock[] {
  const normalized = normalizeMirrorCustomBlocks(entries ?? []);
  return normalized.map((e) => ({
    ...e.block,
    id: e.id,
    hidden: e.hidden,
    insertAfterSection: e.insertAfterSection ?? MIRROR_WIDGET_TOP,
  }));
}

export function stripMirrorCustomBlocks(blocks: EditorMirrorCustomBlock[]): MirrorCustomBlockEntry[] {
  const out: MirrorCustomBlockEntry[] = [];
  for (const b of blocks) {
    const { id, hidden, insertAfterSection, ...rest } = b;
    const block = sanitizeShopBlocks([rest as ShopBlock])[0];
    if (!block) continue;
    out.push({
      id,
      block,
      hidden: hidden === true,
      insertAfterSection: normalizeInsertAnchor(insertAfterSection),
    });
  }
  return out;
}

export type MirrorWidgetSectionOption = { key: string; label: string };
