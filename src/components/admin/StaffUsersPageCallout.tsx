import Link from "next/link";

export function StaffUsersPageCallout({ canManage }: { canManage: boolean }) {
  if (canManage) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        <strong>Üye ≠ panel kullanıcısı.</strong> Vitrinde kayıt olan müşteriye panel yetkisi vermek
        için aşağıdan <strong>+ Panel kullanıcısı ekle</strong> kullanın veya{" "}
        <Link href="/admin/customers?segment=members" className="underline">
          müşteri kartından
        </Link>{" "}
        &quot;Panel kullanıcısı oluştur&quot; ile gelin.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      Panel kullanıcısı ve rol yönetimi yalnızca <strong>Yönetici</strong> rolündeki hesaplarla
      yapılır. Sizde bu yetki yok; mağaza sahibi / admin hesabıyla giriş yapın veya size Yönetici
      rolü atanmasını isteyin.
    </div>
  );
}
