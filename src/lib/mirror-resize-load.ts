import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NextRequest } from "next/server";
import { normalizeMirrorResizeSrc } from "@/lib/mirror-resize-src";
import { prisma } from "@/lib/prisma";

function requestOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host.split(",")[0]!.trim()}`;
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_STORE_URL?.trim() ||
    req.nextUrl.origin
  );
}

/** Yerel disk → Neon storeMedia → statik CDN (Vercel'de public fs dışı dosyalar) */
export async function loadMirrorResizeSourceBytes(
  pathOnly: string,
  req: NextRequest,
): Promise<Buffer | null> {
  if (!normalizeMirrorResizeSrc(pathOnly)) return null;

  try {
    const local = await readFile(join(process.cwd(), "public", pathOnly.replace(/^\//, "")));
    if (local.length) return local;
  } catch {
    /* Vercel — public statik ama lambda fs'de yok */
  }

  const media = await prisma.storeMedia.findFirst({
    where: { url: pathOnly },
    select: { data: true },
  });
  if (media?.data?.length) return Buffer.from(media.data);

  const origin = requestOrigin(req);
  const res = await fetch(`${origin}${pathOnly}`, {
    cache: "force-cache",
    headers: { Accept: "image/*" },
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length ? buf : null;
}
