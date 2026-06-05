import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import { testTrendyolConnection } from "@/lib/marketplace/trendyol/test-connection";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function mergeSecrets(
  stored: Record<string, string>,
  incoming: Record<string, string>,
): Record<string, string> {
  const next = { ...incoming };
  for (const key of ["apiSecret", "secretKey", "lwaClientSecret", "refreshToken"]) {
    if (!next[key]?.trim() && stored[key]?.trim()) {
      next[key] = stored[key];
    }
  }
  return next;
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as Record<string, unknown>;
  const platform = String(body.platform ?? "").trim().toLowerCase();
  if (!platform) {
    return NextResponse.json({ error: "Platform gerekli" }, { status: 400 });
  }

  const integration = await prisma.marketplaceIntegration.findUnique({
    where: { siteId_platform: { siteId: auth.siteId, platform } },
  });

  const stored = parseConfig(integration?.configJson ?? null);
  const incoming =
    body.config && typeof body.config === "object"
      ? (body.config as Record<string, string>)
      : stored;
  const config = mergeSecrets(stored, incoming);

  if (platform === "trendyol") {
    const creds = parseTrendyolConfig(config);
    if (!creds) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Satıcı ID, API Key ve API Secret zorunlu. Trendyol panelindeki Token ve Entegrasyon Referans Kodu API için kullanılmaz.",
        },
        { status: 400 },
      );
    }
    const result = await testTrendyolConnection(creds);
    return NextResponse.json({ result });
  }

  return NextResponse.json(
    { ok: false, message: `${platform} için bağlantı testi henüz desteklenmiyor` },
    { status: 400 },
  );
}
