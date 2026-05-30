import { NextResponse } from "next/server";
import { loadMirrorSearchDrawerPayload } from "@/lib/mirror-store-search-server";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const payload = await loadMirrorSearchDrawerPayload(q);
  return NextResponse.json(payload);
}
