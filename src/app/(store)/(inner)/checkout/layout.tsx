import type { Metadata } from "next";
import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const pathname = (await headers()).get("x-pathname") ?? "/checkout";
  return {
    title: "Ödeme",
    description: "Anatolian Paw ödeme adımı.",
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
    alternates: { canonical: pathname },
  };
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
