import { NextResponse } from "next/server";
import { listTrDistricts } from "@/lib/tr-address/index";

export async function GET(req: Request) {
  const city = new URL(req.url).searchParams.get("city")?.trim() ?? "";
  if (!city) {
    return NextResponse.json({ error: "İl gerekli" }, { status: 400 });
  }
  const districts = listTrDistricts(city);
  if (districts.length === 0) {
    return NextResponse.json({ error: "Geçersiz il" }, { status: 404 });
  }
  return NextResponse.json({ districts });
}
