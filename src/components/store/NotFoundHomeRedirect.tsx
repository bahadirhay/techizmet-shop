"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const COUNTDOWN_SECONDS = 3;

/**
 * Kullanıcıya 404 + geri sayım; HTTP durumu Next.js not-found ile 404 kalır (SEO için doğru).
 */
export function NotFoundHomeRedirect() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      router.replace("/");
      return;
    }
    const timer = window.setTimeout(() => {
      setSecondsLeft((n) => n - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft, router]);

  return (
    <main className="kn-not-found-page">
      <div className="kn-not-found-card">
        <p className="kn-not-found-code" aria-hidden>
          404
        </p>
        <h1>Sayfa bulunamadı</h1>
        <p>
          Ulaşmaya çalıştığınız sayfaya erişilemiyor. Sizi ana sayfaya yönlendiriyoruz.
        </p>
        <p className="kn-not-found-count" aria-live="polite">
          {secondsLeft > 0 ? (
            <>
              <span className="kn-not-found-digits">{secondsLeft}</span>
              <span> saniye içinde yönlendirileceksiniz…</span>
            </>
          ) : (
            <span>Yönlendiriliyor…</span>
          )}
        </p>
        <p className="kn-not-found-actions">
          <Link href="/" className="kn-not-found-link">
            Hemen ana sayfaya git
          </Link>
        </p>
      </div>
      <style>{`
        .kn-not-found-page {
          min-height: 70dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
          color: #1a1a1a;
        }
        .kn-not-found-card {
          width: min(100%, 28rem);
          text-align: center;
          padding: 2.25rem 2rem;
          border-radius: 1.25rem;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid #e8e4df;
          box-shadow: 0 12px 40px rgba(45, 74, 111, 0.08);
        }
        .kn-not-found-code {
          margin: 0 0 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #a1a1aa;
        }
        .kn-not-found-card h1 {
          font-size: clamp(1.5rem, 4vw, 1.875rem);
          font-weight: 700;
          line-height: 1.25;
          margin: 0 0 0.75rem;
          color: #2d4a6f;
        }
        .kn-not-found-card p {
          margin: 0;
          line-height: 1.6;
          color: #52525b;
        }
        .kn-not-found-count {
          margin-top: 1.25rem !important;
          font-size: 0.95rem;
        }
        .kn-not-found-digits {
          display: inline-block;
          min-width: 1.25em;
          font-size: 1.75rem;
          font-weight: 700;
          color: #2d4a6f;
          font-variant-numeric: tabular-nums;
        }
        .kn-not-found-actions {
          margin-top: 1.5rem !important;
        }
        .kn-not-found-link {
          display: inline-block;
          padding: 0.65rem 1.25rem;
          border-radius: 0.5rem;
          background: #2d4a6f;
          color: #fff !important;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .kn-not-found-link:hover {
          background: #243d5c;
        }
      `}</style>
    </main>
  );
}
