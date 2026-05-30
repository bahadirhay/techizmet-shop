import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminSession } from "@/lib/session";

export default async function AdminLoginPage() {
  const s = await getAdminSession();
  if (s.isLoggedIn) redirect("/admin/dashboard");
  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-center text-lg font-semibold">Mağaza yönetimi</h1>
      <p className="mt-1 text-center text-sm text-zinc-500">Techizmet Shop · port 5555</p>
      <LoginForm />
    </div>
  );
}
