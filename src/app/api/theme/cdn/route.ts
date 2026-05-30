import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { resolveMirrorThemeFile } from "@/lib/mirror-cdn-assets";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function contentType(filename: string): string {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")).toLowerCase() : "";
  return MIME[ext] ?? "application/octet-stream";
}

/** Eksik / yanlış hash — HTTrack dosya adını eşleştirip sunar */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pathParam = url.searchParams.get("path")?.trim();
  if (!pathParam || pathParam.includes("..")) {
    return NextResponse.json({ error: "Geçersiz path" }, { status: 400 });
  }

  const publicPath = pathParam.startsWith("/") ? pathParam.slice(1) : pathParam;
  const resolved = resolveMirrorThemeFile(publicPath);
  if (!resolved) {
    return new NextResponse(null, { status: 404 });
  }

  const body = readFileSync(resolved.abs);
  const stat = statSync(resolved.abs);
  const name = resolved.rel.split("/").pop() ?? "file";

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType(name),
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
