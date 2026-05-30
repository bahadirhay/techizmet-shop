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

const DEV_SECRET = "dev-insecure-secret-min-32-chars!!";

function resolveSessionSecret(): string {
  const trimmed = (process.env.SESSION_SECRET ?? "").trim();
  return trimmed.length >= 32 ? trimmed : DEV_SECRET;
}

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
