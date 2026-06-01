import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminChangePasswordForm } from "@/components/admin/AdminChangePasswordForm";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function AdminSecurityPage() {
  await requireStaffPage();

  return (
    <div>
      <AdminPageHeader title="Güvenlik" description="Panel giriş şifrenizi buradan değiştirin." />
      <div className="mt-6 max-w-lg rounded-xl border border-zinc-200 bg-white p-6">
        <AdminChangePasswordForm />
      </div>
      <p className="mt-4 text-sm text-zinc-500">
        Diğer panel kullanıcılarının şifresi ve rolleri:{" "}
        <a href="/admin/settings/users" className="text-[var(--kn-brand)] underline">
          Ayarlar → Personel & panel yetkileri
        </a>
        . Mağaza üyesi şifresi için müşteri kartı.
      </p>
    </div>
  );
}
