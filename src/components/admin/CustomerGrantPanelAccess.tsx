import Link from "next/link";
import { hasStaffPermission } from "@/lib/staff-permissions";
import { suggestStaffUsernameFromEmail } from "@/lib/staff-users-guard";
import type { StaffAccess } from "@/lib/staff-auth";

export function CustomerGrantPanelAccess({
  auth,
  customer,
}: {
  auth: StaffAccess;
  customer: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    passwordHash: string | null;
  };
}) {
  if (!hasStaffPermission(auth.permissions, "users.manage")) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-medium">Panel yetkisi</p>
        <p className="mt-1 text-amber-900/90">
          Mağaza üyeliği panel erişimi değildir. Panel kullanıcıları yalnızca yönetici hesabıyla
          oluşturulur.
        </p>
      </div>
    );
  }

  if (!customer.email) {
    return (
      <div className="rounded-xl border bg-zinc-50 p-4 text-sm text-zinc-600">
        Panel erişimi için müşteride e-posta adresi olmalı.
      </div>
    );
  }

  const displayName = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
  const username = suggestStaffUsernameFromEmail(customer.email);
  const q = new URLSearchParams({
    email: customer.email,
    ...(displayName ? { name: displayName } : {}),
    customerId: customer.id,
  });

  return (
    <div className="rounded-xl border border-[var(--kn-brand)]/30 bg-[var(--kn-brand)]/5 p-4 text-sm">
      <h2 className="font-semibold text-zinc-900">Panel erişimi (admin girişi)</h2>
      <p className="mt-2 text-zinc-600">
        Bu kişi vitrinde <strong>mağaza üyesi</strong>
        {customer.passwordHash ? "" : " değil (henüz şifre yok)"}. Ürün düzenleme, muhasebe vb. için
        ayrı bir <strong>panel kullanıcısı</strong> oluşturmalısınız; vitrin şifresi ile admin panele
        giriş yapılamaz.
      </p>
      <Link
        href={`/admin/settings/users?${q.toString()}`}
        className="mt-3 inline-flex rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Panel kullanıcısı oluştur
      </Link>
      <p className="mt-2 text-xs text-zinc-500">
        Önerilen giriş adı: <code className="rounded bg-white px-1">{username}</code> (e-postadan)
      </p>
    </div>
  );
}
