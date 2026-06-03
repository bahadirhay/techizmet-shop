import { NextResponse } from "next/server";
import { listTrCities } from "@/lib/tr-address/index";

export async function GET() {
  return NextResponse.json({ cities: listTrCities() });
}
