import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { loadStaffSession } from "@/lib/staff-auth";
import { ensureStoreTenant } from "@/lib/store-tenant";
import { getDefaultSite } from "@/lib/site";

export async function POST(req: Request) {
  const rl = checkRateLimit(`staff-login:${clientIp(req)}`, 10, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);
  await ensureStoreTenant();
  const body = (await req.json()) as { login?: string; password?: string };
  const login = body.login?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!login || !password) {
    return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
  }

  const site = await getDefaultSite();
  const user = await prisma.shopStaffUser.findUnique({
    where: { siteId_username: { siteId: site.id, username: login } },
  });
  if (!user?.active) {
    return NextResponse.json({ error: "Geçersiz" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Geçersiz" }, { status: 401 });

  const loaded = await loadStaffSession(user.id, site.id);
  if (!loaded) return NextResponse.json({ error: "Geçersiz" }, { status: 401 });

  const session = await getAdminSession();
  session.isLoggedIn = true;
  session.staffUserId = loaded.staffUserId;
  session.username = loaded.username;
  session.roleSlug = loaded.roleSlug;
  session.siteId = loaded.siteId;
  session.permissionsJson = JSON.stringify(loaded.permissions);
  await session.save();

  return NextResponse.json({ ok: true });
}
