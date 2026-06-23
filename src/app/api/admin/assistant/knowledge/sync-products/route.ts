import { NextResponse } from "next/server";
import { syncAssistantProductsToKnowledge } from "@/lib/assistant/sync-products";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const result = await syncAssistantProductsToKnowledge(auth.siteId);
  return NextResponse.json(result);
}
