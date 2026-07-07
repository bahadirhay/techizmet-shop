import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function mergeMarketplaceConfig(
  existing: Record<string, string>,
  incoming: Record<string, unknown>,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (typeof v === "string") next[k] = v;
    else if (v != null) next[k] = String(v);
  }
  for (const key of ["apiSecret", "secretKey", "lwaClientSecret", "refreshToken"]) {
    if (!next[key]?.trim() && existing[key]?.trim()) {
      next[key] = existing[key];
    }
  }
  return next;
}

export async function GET() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const items = await prisma.marketplaceIntegration.findMany({
    where: { siteId: auth.siteId },
    orderBy: { platform: "asc" },
  });
  return NextResponse.json({ integrations: items });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as Record<string, unknown>;
  const platform = String(body.platform ?? "").trim().toLowerCase();
  const label = String(body.label ?? "").trim();
  if (!platform || !label) {
    return NextResponse.json({ error: "Platform ve etiket gerekli" }, { status: 400 });
  }

  const existing = await prisma.marketplaceIntegration.findUnique({
    where: { siteId_platform: { siteId: auth.siteId, platform } },
  });
  const merged =
    body.config && typeof body.config === "object"
      ? mergeMarketplaceConfig(
          parseConfig(existing?.configJson ?? null),
          body.config as Record<string, unknown>,
        )
      : parseConfig(existing?.configJson ?? null);
  const config = Object.keys(merged).length > 0 ? JSON.stringify(merged) : null;

  const row = await prisma.marketplaceIntegration.upsert({
    where: { siteId_platform: { siteId: auth.siteId, platform } },
    create: {
      siteId: auth.siteId,
      platform,
      label,
      active: Boolean(body.active),
      configJson: config,
    },
    update: {
      label,
      active: Boolean(body.active),
      configJson: config,
      lastError: null,
    },
  });
  return NextResponse.json({ integration: row });
}
