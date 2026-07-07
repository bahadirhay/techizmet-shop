import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { parseEfaturaSettings } from "@/lib/efatura/settings";
import { mergeEfaturaTestConfig, testGibConnection } from "@/lib/efatura/gib-test-connection";
import { parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  let body: { username?: string; password?: string; testMode?: boolean } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* body yok */
  }

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const stored = parseEfaturaSettings(settings.efatura);
  const effectiveConfig = mergeEfaturaTestConfig(stored, {
    username: body.username,
    password: body.password,
    testMode: body.testMode,
  });

  if (!effectiveConfig.username || !effectiveConfig.password) {
    return NextResponse.json(
      {
        ok: false,
        message: "GİB bilgileri eksik. Kullanıcı kodu ve parola girilmeli.",
        environment: effectiveConfig.testMode ? "TEST" : "PROD",
        debug: {
          hasUsername: Boolean(effectiveConfig.username),
          hasPasswordFromEnv: Boolean(process.env.GIB_PASSWORD),
          hasPasswordFromDb: Boolean(settings.efatura?.password),
          hasPasswordFromForm: Boolean(body.password?.trim()),
        },
      },
      { status: 400 },
    );
  }

  const result = await testGibConnection(effectiveConfig, settings);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
