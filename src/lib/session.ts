import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type AdminSession = {
  isLoggedIn?: boolean;
  staffUserId?: string;
  username?: string;
  roleSlug?: string;
  siteId?: string;
  permissionsJson?: string;
};

import { resolveSessionSecret } from "@/lib/session-secret";

export function getAdminSessionOptions(): SessionOptions {
  return {
    password: resolveSessionSecret(),
    cookieName: "techizmet_shop_admin",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 14,
      path: "/",
    },
  };
}

export async function getAdminSession() {
  return getIronSession<AdminSession>(await cookies(), getAdminSessionOptions());
}
