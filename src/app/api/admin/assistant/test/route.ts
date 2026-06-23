import { NextResponse } from "next/server";
import { runAssistantTestMessage } from "@/lib/assistant/run-pipeline";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { message?: string; externalUserId?: string };
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message gerekli" }, { status: 400 });
  }

  const result = await runAssistantTestMessage(
    auth.siteId,
    message,
    body.externalUserId?.trim() || "admin-test",
  );

  return NextResponse.json(result);
}
