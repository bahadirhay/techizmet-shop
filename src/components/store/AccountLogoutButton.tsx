"use client";

import { useRouter } from "next/navigation";

export function AccountLogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/account/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" className="kn-btn kn-btn--outline" onClick={logout}>
      Çıkış
    </button>
  );
}
