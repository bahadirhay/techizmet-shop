import { redirect } from "next/navigation";
import { AccountRegisterForm } from "@/components/store/AccountRegisterForm";
import { getCustomerSession } from "@/lib/customer-session";

export default async function AccountRegisterPage() {
  const session = await getCustomerSession();
  if (session.isLoggedIn) redirect("/account");
  return (
    <div className="kn-section">
      <AccountRegisterForm />
    </div>
  );
}
