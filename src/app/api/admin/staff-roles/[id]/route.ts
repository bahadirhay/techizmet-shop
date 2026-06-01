import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";
import { isAdminRoleSlug } from "@/lib/staff-role-presets";
import { isValidStaffPermission } from "@/lib/staff-permissions";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("users.manage");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = (await req.json()) as { label?: string; permissions?: string[] };

  const role = await prisma.shopStaffRole.findFirst({
    where: { id, siteId: auth.siteId },
  });
  if (!role) return NextResponse.json({ error: "Rol bulunamadı" }, { status: 404 });

  if (isAdminRoleSlug(role.slug)) {
    return NextResponse.json(
      { error: "Yönetici rolünün yetkileri sabittir (tam yetki)" },
      { status: 400 },
    );
  }

  const data: { label?: string; permissionsJson?: string } = {};

  if (body.label !== undefined) {
    const label = body.label.trim();
    if (!label) return NextResponse.json({ error: "Rol adı gerekli" }, { status: 400 });
    data.label = label;
  }

  if (body.permissions !== undefined) {
    if (!Array.isArray(body.permissions)) {
      return NextResponse.json({ error: "Geçersiz yetki listesi" }, { status: 400 });
    }
    const perms = [...new Set(body.permissions.filter((p) => typeof p === "string" && p))];
    if (perms.length === 0) {
      return NextResponse.json({ error: "En az bir yetki seçin" }, { status: 400 });
    }
    for (const p of perms) {
      if (!isValidStaffPermission(p)) {
        return NextResponse.json({ error: `Geçersiz yetki: ${p}` }, { status: 400 });
      }
    }
    data.permissionsJson = JSON.stringify(perms);
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  await prisma.shopStaffRole.update({ where: { id: role.id }, data });

  return NextResponse.json({ ok: true });
}
