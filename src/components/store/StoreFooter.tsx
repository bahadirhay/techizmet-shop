import Link from "next/link";
import type { StoreMessages } from "@/lib/i18n/messages";

export function StoreFooter({
  siteName,
  messages,
}: {
  siteName: string;
  messages: StoreMessages["footer"];
}) {
  return (
    <footer className="kn-footer">
      <div className="kn-footer__grid">
        <div>
          <strong>{siteName}</strong>
          <p className="kn-footer__muted">{messages.tagline}</p>
        </div>
        <div>
          <p className="kn-footer__title">{messages.quickLinks}</p>
          <Link href="/">{messages.home}</Link>
          <Link href="/collections/all">{messages.collections}</Link>
          <Link href="/pages/about">{messages.about}</Link>
          <Link href="/pages/contact">{messages.contact}</Link>
          <Link href="/pages/faq">{messages.faq}</Link>
        </div>
        <div>
          <p className="kn-footer__title">{messages.legal}</p>
          <Link href="/pages/kvkk">{messages.privacy}</Link>
          <Link href="/pages/mesafeli-satis">{messages.distanceSales}</Link>
        </div>
      </div>
      <p className="kn-footer__copy">© {new Date().getFullYear()} {siteName}</p>
    </footer>
  );
}
