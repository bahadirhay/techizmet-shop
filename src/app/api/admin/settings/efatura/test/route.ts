import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { parseEfaturaSettings } from "@/lib/efatura/settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { refreshGibSession } from "@/lib/efatura/gib-session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  // Doğrudan Prisma'dan oku — cache'lenmiş settings'i atlıyoruz
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const config = parseEfaturaSettings(settings.efatura);

  if (!config.username || !config.password) {
    return NextResponse.json(
      { ok: false, message: "GİB bilgileri eksik. Kullanıcı kodu ve parola girilmeli." },
      { status: 400 },
    );
  }

  try {
    const session = await refreshGibSession(auth.siteId, config);

    type GibClient = {
      getUserData: (token: string) => Promise<Record<string, unknown>>;
    };
    const client = session.client as unknown as GibClient;
    const userData = await client.getUserData(session.token);

    const name =
      (userData?.ad as string | undefined) ||
      (userData?.firstName as string | undefined) ||
      (userData?.name as string | undefined) ||
      null;

    return NextResponse.json({
      ok: true,
      message: `GİB bağlantısı başarılı${name ? ` — ${name}` : ""}.`,
      userData: {
        name: name ?? undefined,
        vkn: (userData?.vkn as string | undefined) ?? (userData?.taxId as string | undefined),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, message: `GİB bağlantı hatası: ${msg}` },
      { status: 400 },
    );
  }
}
