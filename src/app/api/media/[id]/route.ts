import type { NextRequest } from "next/server";
import { serveStoreMedia } from "@/lib/media-serve";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Neon DB'de saklanan medya — logo, ürün görseli, video vb. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return serveStoreMedia(req, id);
}
