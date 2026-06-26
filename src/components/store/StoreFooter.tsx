import Link from "next/link";
import type { StoreMessages } from "@/lib/i18n/messages";
import { socialIconSvg, type SocialLink } from "@/lib/social-links";

export function StoreFooter({
  siteName,
  messages,
  socialLinks,
}: {
  siteName: string;
  messages: StoreMessages["footer"];
  socialLinks?: SocialLink[];
}) {
  return (
    <footer className="kn-footer">
      <div className="kn-footer__grid">
        <div>
          <strong>{siteName}</strong>
          <p className="kn-footer__muted">{messages.tagline}</p>
          {socialLinks && socialLinks.length > 0 && (
            <div className="kn-footer__social" style={{ display: "flex", flexWrap: "wrap", marginTop: 12 }}>
              {socialLinks.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer me"
                  aria-label={l.label}
                  title={l.label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 38,
                    height: 38,
                    borderRadius: 9999,
                    border: "1px solid currentColor",
                    color: "inherit",
                    opacity: 0.8,
                    margin: "4px 10px 4px 0",
                  }}
                  dangerouslySetInnerHTML={{ __html: socialIconSvg(l.platform) }}
                />
              ))}
            </div>
          )}
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
