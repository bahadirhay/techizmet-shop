import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { getStoreLocale } from "@/lib/i18n/server";
import { loadMirrorAccountDashboardPayload } from "@/lib/mirror-account-dashboard-server";
import {
  buildAccountDashboardMarkup,
  buildAccountWelcomeHtml,
} from "@/lib/mirror-account-dashboard";

export async function GET() {
  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.customerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locale = await getStoreLocale();
  const payload = await loadMirrorAccountDashboardPayload(session.customerId, locale);
  if (!payload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      markup: buildAccountDashboardMarkup(payload),
      welcomeHtml: buildAccountWelcomeHtml(payload),
    },
    {
      headers: { "Cache-Control": "private, no-cache, must-revalidate" },
    },
  );
}
