import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";
import { isAdminRoleSlug } from "@/lib/staff-role-presets";
import { countActiveAdmins } from "@/lib/staff-users-guard";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("users.manage");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = (await req.json()) as {
    displayName?: string;
    active?: boolean;
    roleIds?: string[];
  };

  const user = await prisma.shopStaffUser.findFirst({
    where: { id, siteId: auth.siteId },
    include: { roleAssignments: { include: { role: true } } },
  });
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  const isSelf = user.id === auth.staffUserId;
  const hadAdmin = user.roleAssignments.some((a) => isAdminRoleSlug(a.role.slug));

  if (body.active === false) {
    if (isSelf) {
      return NextResponse.json({ error: "Kendi hesabınızı pasifleştiremezsiniz" }, { status: 400 });
    }
    if (hadAdmin) {
      const others = await countActiveAdmins(prisma, auth.siteId, user.id);
      if (others === 0) {
        return NextResponse.json(
          { error: "Son aktif yönetici pasifleştirilemez" },
          { status: 400 },
        );
      }
    }
  }

  let roleIds: string[] | undefined;
  if (body.roleIds !== undefined) {
    roleIds = [...new Set(Array.isArray(body.roleIds) ? body.roleIds.filter(Boolean) : [])];
    if (roleIds.length === 0) {
      return NextResponse.json({ error: "En az bir rol seçin" }, { status: 400 });
    }
    const roles = await prisma.shopStaffRole.findMany({
      where: { siteId: auth.siteId, id: { in: roleIds } },
      select: { id: true, slug: true },
    });
    if (roles.length !== roleIds.length) {
      return NextResponse.json({ error: "Geçersiz rol seçimi" }, { status: 400 });
    }

    const willHaveAdmin = roles.some((r) => isAdminRoleSlug(r.slug));
    if (hadAdmin && !willHaveAdmin) {
      const others = await countActiveAdmins(prisma, auth.siteId, user.id);
      if (others === 0) {
        return NextResponse.json(
          { error: "Son yöneticiden admin rolü kaldırılamaz" },
          { status: 400 },
        );
      }
    }
    if (isSelf && !willHaveAdmin) {
      return NextResponse.json(
        { error: "Kendi hesabınızdan yönetici rolünü kaldıramazsınız" },
        { status: 400 },
      );
    }
  }

  const displayName =
    body.displayName !== undefined ? body.displayName.trim() || null : undefined;

  await prisma.$transaction(async (tx) => {
    if (roleIds) {
      await tx.shopStaffRoleAssignment.deleteMany({ where: { staffUserId: user.id } });
      await tx.shopStaffRoleAssignment.createMany({
        data: roleIds.map((roleId) => ({ staffUserId: user.id, roleId })),
      });
    }
    await tx.shopStaffUser.update({
      where: { id: user.id },
      data: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });
  });

  return NextResponse.json({ ok: true });
}
