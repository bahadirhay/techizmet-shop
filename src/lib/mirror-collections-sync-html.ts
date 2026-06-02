import "server-only";

import { parseHTML } from "linkedom";
import {
  applyCollectionsCardsFromAdmin,
  type VitrinCollectionCard,
} from "@/lib/mirror-collections-sync";

/** Sunucu / prebuild — ana sayfa koleksiyon kartları */
export function applyCollectionsCardsToMirrorHtml(html: string, collections: VitrinCollectionCard[]): string {
  if (!collections.length) return html;
  const { document } = parseHTML(html);
  applyCollectionsCardsFromAdmin(document, collections);
  document.documentElement.setAttribute("data-kn-collections-server", "1");
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}
