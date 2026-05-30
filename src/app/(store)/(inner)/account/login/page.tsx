import { redirect } from "next/navigation";
import { AccountLoginForm } from "@/components/store/AccountLoginForm";
import { getCustomerSession } from "@/lib/customer-session";

export default async function AccountLoginPage() {
  const session = await getCustomerSession();
  if (session.isLoggedIn) redirect("/account");
  return (
    <div className="kn-section">
      <AccountLoginForm />
    </div>
  );
}
