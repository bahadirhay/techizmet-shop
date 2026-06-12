export type OAuthCustomerFields = {
  passwordHash?: string | null;
  googleSub?: string | null;
  appleSub?: string | null;
};

export function isOAuthLinkedCustomer(customer: OAuthCustomerFields): boolean {
  return Boolean(customer.googleSub?.trim() || customer.appleSub?.trim());
}

/** Google/Apple ile kayıtlı hesaba şifre atanamaz */
export function canSetPasswordOnCustomer(customer: OAuthCustomerFields): boolean {
  if (customer.passwordHash) return false;
  return !isOAuthLinkedCustomer(customer);
}
