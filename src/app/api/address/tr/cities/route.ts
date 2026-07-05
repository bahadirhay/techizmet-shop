import { NextResponse } from "next/server";
import { TR_ADDRESS_CACHE_CONTROL } from "@/lib/tr-address/api-cache";
import { listTrCities } from "@/lib/tr-address/index";

export async function GET() {
  return NextResponse.json(
    { cities: listTrCities() },
    { headers: { "Cache-Control": TR_ADDRESS_CACHE_CONTROL } },
  );
}
