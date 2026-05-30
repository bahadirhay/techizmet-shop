import { nanoid } from "nanoid";
import type { ShopBlock } from "@/lib/blocks/schema";

export type EditorShopBlock = ShopBlock & { id: string };

export function ensureEditorBlocks(blocks: ShopBlock[]): EditorShopBlock[] {
  return blocks.map((b) => ({
    ...b,
    id: (b as EditorShopBlock).id ?? nanoid(10),
  }));
}

export function stripBlockIds(blocks: EditorShopBlock[]): ShopBlock[] {
  return blocks.map(({ id: _id, ...rest }) => rest as ShopBlock);
}
