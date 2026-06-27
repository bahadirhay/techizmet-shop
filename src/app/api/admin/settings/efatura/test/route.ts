import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { getEfaturaConfig, efaturaReady } from "@/lib/efatura/settings";
import { refreshGibSession } from "@/lib/efatura/gib-session";

export async function POST() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const config = await getEfaturaConfig(auth.siteId);
  if (!efaturaReady(config)) {
    return NextResponse.json(
      { ok: false, message: "GİB bilgileri eksik. Kullanıcı kodu ve parola girilmeli." },
      { status: 400 },
    );
  }

  try {
    // Force fresh login — token cache'i atla
    const session = await refreshGibSession(auth.siteId, config);

    // getUserData ile kullanıcı adını al
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
