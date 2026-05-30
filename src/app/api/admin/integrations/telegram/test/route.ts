import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { sendTelegramTestMessage } from "@/lib/telegram/order-telegram-notify";

export async function POST() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const result = await sendTelegramTestMessage(settings, site?.name ?? "Mağaza");

  if (result.ok) {
    return NextResponse.json({ ok: true, message: "Test mesajı Telegram'a gönderildi." });
  }
  if (result.skipped) {
    return NextResponse.json(
      {
        ok: false,
        message: "Bot token ve chat id girin, kaydedin ve tekrar deneyin.",
        error: result.error,
      },
      { status: 400 },
    );
  }
  return NextResponse.json({ error: result.error }, { status: 400 });
}
