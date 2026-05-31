import { Suspense } from "react";
import { AccountResetPasswordForm } from "@/components/store/AccountResetPasswordForm";

export default function AccountResetPasswordPage() {
  return (
    <div className="kn-section">
      <Suspense fallback={<p className="kn-account__hint">Yükleniyor…</p>}>
        <AccountResetPasswordForm />
      </Suspense>
    </div>
  );
}
