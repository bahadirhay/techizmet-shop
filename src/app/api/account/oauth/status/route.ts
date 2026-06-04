import { NextResponse } from "next/server";
import { isOAuthProviderEnabled } from "@/lib/oauth/config";

export async function GET() {
  const [google, apple] = await Promise.all([
    isOAuthProviderEnabled("google"),
    isOAuthProviderEnabled("apple"),
  ]);
  return NextResponse.json({ google, apple });
}
