import type { Metadata } from "next";
import { NotFoundHomeRedirect } from "@/components/store/NotFoundHomeRedirect";

/**
 * Gerçek HTTP 404 döner (Next.js not-found). Arama motorları için soft-200
 * redirect yerine bu doğru sinyal; kullanıcıya JS ile ana sayfa yönlendirmesi UX.
 */
export const metadata: Metadata = {
  title: "Sayfa bulunamadı",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundHomeRedirect />;
}
