import { NextResponse } from "next/server";
import {
  deleteAttributeMapping,
  listAttributeMappings,
  upsertAttributeMapping,
} from "@/lib/marketplace/attribute-mapping";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const params = new URL(req.url).searchParams;
  const platform = params.get("platform")?.trim().toLowerCase() ?? "";
  if (!platform) return NextResponse.json({ error: "Platform gerekli" }, { status: 400 });
  const categoryId = params.get("categoryId")?.trim() || null;

  const mappings = await listAttributeMappings(auth.siteId, platform, categoryId);
  return NextResponse.json({ mappings });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    platform?: string;
    categoryId?: string | null;
    attributeId?: number;
    attributeName?: string;
    attributeValueId?: number | null;
    attributeValueName?: string | null;
    customValue?: string | null;
    required?: boolean;
  };

  const platform = String(body.platform ?? "").trim().toLowerCase();
  const attributeId = Number(body.attributeId);
  if (!platform || !Number.isFinite(attributeId) || !body.attributeName?.trim()) {
    return NextResponse.json(
      { error: "Platform, attributeId ve attributeName gerekli" },
      { status: 400 },
    );
  }
  if (body.attributeValueId == null && !body.customValue?.trim()) {
    return NextResponse.json({ error: "Değer seçin veya serbest metin girin" }, { status: 400 });
  }

  const mapping = await upsertAttributeMapping({
    siteId: auth.siteId,
    platform,
    categoryId: body.categoryId ?? null,
    attributeId,
    attributeName: body.attributeName.trim(),
    attributeValueId: body.attributeValueId ?? null,
    attributeValueName: body.attributeValueName ?? null,
    customValue: body.customValue ?? null,
    required: body.required ?? false,
  });

  return NextResponse.json({ mapping });
}

export async function DELETE(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const params = new URL(req.url).searchParams;
  const platform = params.get("platform")?.trim().toLowerCase() ?? "";
  const attributeId = Number(params.get("attributeId"));
  if (!platform || !Number.isFinite(attributeId)) {
    return NextResponse.json({ error: "Platform ve attributeId gerekli" }, { status: 400 });
  }
  const categoryId = params.get("categoryId")?.trim() || null;

  await deleteAttributeMapping({ siteId: auth.siteId, platform, categoryId, attributeId });
  return NextResponse.json({ ok: true });
}
